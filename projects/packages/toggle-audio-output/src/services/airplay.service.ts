import { setTimeout as delay } from 'node:timers/promises';
import { $ } from 'zurk';
import { AIRPLAY_BROWSE_MS, AIRPLAY_SELECT_ATTEMPTS, AIRPLAY_SELECT_RETRY_DELAY_MS } from '../config/constants';

/**
 * `_airplay._tcp` rather than `_raop._tcp` - some TVs advertise only the former,
 * yet the Sound menu still offers them as outputs.
 */
const TXT_ROW = /^(\S+?)\._airplay\._tcp\s+TXT\s+(.*)$/;
const TXT_ENTRY = /"((?:[^"\\]|\\.)*)"/g;
const DNS_ESCAPE = /\\(\d{3})|\\(.)|([^\\]+)/gsu;

/** Macs advertise AirPlay Receiver too - this one included - but the Sound menu never offers one as an output. */
const MAC_MODEL = /^i?mac/i;

/** `dns-sd -Z` prints names DNS-escaped - a space is `\032`, and raw bytes may be escaped one by one. */
function unescapeDnsName(name: string): string {
  const bytes: number[] = [];

  for (const [, code, escaped, plain] of name.matchAll(DNS_ESCAPE)) {
    if (code) {
      bytes.push(Number(code));
    } else {
      bytes.push(...Buffer.from(escaped ?? plain ?? '', 'utf8'));
    }
  }

  return Buffer.from(bytes).toString('utf8');
}

function parseAirPlayBrowse(stdout: string): string[] {
  const receivers = stdout.split('\n').flatMap((line) => {
    const row = TXT_ROW.exec(line.trim());
    if (!row) {
      return [];
    }

    const [, name = '', record = ''] = row;
    const model = Array.from(record.matchAll(TXT_ENTRY), ([, entry = '']) => entry)
      .find((entry) => entry.startsWith('model='))
      ?.slice('model='.length);

    return model && MAC_MODEL.test(model) ? [] : [unescapeDnsName(name)];
  });

  return Array.from(new Set(receivers));
}

/** `dns-sd -Z` browses until killed, so it runs on a timeout and keeps whatever it printed. */
export async function discoverAirPlayReceivers(): Promise<string[]> {
  const { stdout } = await $({ nothrow: true, timeout: AIRPLAY_BROWSE_MS })`dns-sd -Z _airplay._tcp local.`;

  return parseAirPlayBrowse(stdout);
}

/**
 * No API can pick an AirPlay receiver on macOS, so this presses its row in Control Center's
 * Sound module. Elements are matched by AXIdentifier, which unlike labels is not localized,
 * and the receiver arrives as `argv` so its name is never spliced into the script.
 */
const SELECT_RECEIVER_SCRIPT = `
on findByIdentifier(parent_element, wanted_value)
    tell application "System Events"
        repeat with candidate in (UI elements of parent_element)
            try
                if (value of attribute "AXIdentifier" of candidate) is wanted_value then return contents of candidate
            end try
        end repeat
    end tell
    return missing value
end findByIdentifier

on findByRole(parent_element, wanted_value)
    tell application "System Events"
        repeat with candidate in (UI elements of parent_element)
            try
                if (role of candidate) is wanted_value then return contents of candidate
            end try
        end repeat
    end tell
    return missing value
end findByRole

on run argv
    set device_id to "sound-device-" & (item 1 of argv)

    tell application "System Events"
        tell application process "ControlCenter"
            set cc_item to my findByIdentifier(menu bar 1, "com.apple.menuextra.controlcenter")
            if cc_item is missing value then error "Control Center is missing from the menu bar"

            -- a panel left over from a previous run may still be closing, and clicking now would reopen it
            repeat 20 times
                if (count of windows) is 0 then exit repeat
                delay 0.1
            end repeat

            click cc_item
            repeat 30 times
                if (count of windows) > 0 then exit repeat
                delay 0.1
            end repeat
            if (count of windows) is 0 then error "Control Center did not open"

            set err_text to ""
            try
                set cc_panel to group 1 of window 1
                set sound_module to my findByIdentifier(cc_panel, "controlcenter-volume")
                if sound_module is missing value then error "the Sound module is missing from Control Center"
                perform action "AXPress" of sound_module

                -- receivers are discovered while the list is open, and the extra ones sit behind a disclosure triangle
                set device_row to missing value
                set list_expanded to false
                repeat 40 times
                    try
                        set device_list to scroll area 1 of cc_panel
                        set device_row to my findByIdentifier(device_list, device_id)
                        if device_row is not missing value then exit repeat

                        if not list_expanded then
                            set more_button to my findByRole(device_list, "AXDisclosureTriangle")
                            if more_button is not missing value then
                                if (value of more_button) is 0 then perform action "AXPress" of more_button
                                set list_expanded to true
                            end if
                        end if
                    end try
                    delay 0.1
                end repeat
                if device_row is missing value then error "Control Center does not offer " & (item 1 of argv) & " as a sound output"

                if (value of device_row) is 0 then click device_row
            on error errMsg
                set err_text to errMsg
            end try

            -- clicking the menu bar item from the Sound view does not close the panel, but Escape does
            if (count of windows) > 0 then key code 53
            repeat 10 times
                if (count of windows) is 0 then exit repeat
                delay 0.1
            end repeat
            if (count of windows) > 0 then click cc_item

            if err_text is not "" then error err_text
        end tell
    end tell
end run
`.trim();

export async function streamToAirPlay(receiver: string): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= AIRPLAY_SELECT_ATTEMPTS; attempt++) {
    const result = await $({ nothrow: true })`osascript -e ${SELECT_RECEIVER_SCRIPT} ${receiver}`;
    if (result.status === 0) {
      return;
    }

    /** Matched on -25211 and not -1719, which is also the flaky `Invalid index` the retry exists for. */
    if (/assistive access|-25211/i.test(result.stderr)) {
      throw new Error('Alfred needs Accessibility access - System Settings › Privacy & Security › Accessibility');
    }

    lastError = new Error(result.stderr.trim() || `osascript exited with code ${result.status}`);

    if (attempt < AIRPLAY_SELECT_ATTEMPTS) {
      await delay(AIRPLAY_SELECT_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}
