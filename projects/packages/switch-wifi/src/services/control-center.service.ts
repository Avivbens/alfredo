import { setTimeout as delay } from 'node:timers/promises';
import { $ } from 'zurk';
import { CONTROL_CENTER_ATTEMPTS, CONTROL_CENTER_RETRY_DELAY_MS } from '../config/constants';
import { type JoinOutcome, JoinOutcomeSchema } from '../models/join-outcome.schema';

/**
 * Core WLAN - and so `networksetup` - can no longer join a saved network with its stored password,
 * so this presses the network's row in Control Center's Wi-Fi module, exactly like a click would.
 * Elements are matched by AXIdentifier, which unlike labels is not localized, and the SSID
 * arrives as `argv` so it is never spliced into the script.
 */
const JOIN_NETWORK_SCRIPT = `
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

on run argv
    set network_id to "wifi-network-" & (item 1 of argv)

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

            set outcome to "joining"
            set err_text to ""
            set err_number to 0
            try
                set cc_panel to group 1 of window 1
                set wifi_module to my findByIdentifier(cc_panel, "controlcenter-wifi")
                if wifi_module is missing value then error "the Wi-Fi module is missing from Control Center"
                perform action "AXPress" of wifi_module

                -- saved networks in range are listed above the collapsed Other Networks, and keep appearing while the list is open
                set network_row to missing value
                repeat 40 times
                    try
                        set network_row to my findByIdentifier(scroll area 1 of cc_panel, network_id)
                        if network_row is not missing value then exit repeat
                    end try
                    delay 0.1
                end repeat
                if network_row is missing value then error (item 1 of argv) & " is not in range"

                if (value of network_row) is 1 then
                    set outcome to "already-connected"
                else
                    click network_row
                end if
            on error errMsg number errNum
                set err_text to errMsg
                set err_number to errNum
            end try

            -- clicking the menu bar item from the Wi-Fi view does not close the panel, but Escape does
            if (count of windows) > 0 then key code 53
            repeat 10 times
                if (count of windows) is 0 then exit repeat
                delay 0.1
            end repeat
            if (count of windows) > 0 then click cc_item

            if err_text is not "" then error err_text number err_number
            return outcome
        end tell
    end tell
end run
`.trim();

/** osascript reports a script's own `error` as `<position>: execution error: <text> (<number>)`. */
function scriptErrorOf(stderr: string): string {
  return stderr
    .trim()
    .replace(/^.*?execution error: /s, '')
    .replace(/ \(-?\d+\)$/, '');
}

export async function joinNetwork(ssid: string): Promise<JoinOutcome> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CONTROL_CENTER_ATTEMPTS; attempt++) {
    const result = await $({ nothrow: true })`osascript -e ${JOIN_NETWORK_SCRIPT} ${ssid}`;
    if (result.status === 0) {
      return JoinOutcomeSchema.parse(result.stdout.trim());
    }

    /** Matched on -25211 and not -1719, which is also the flaky `Invalid index` the retry exists for. */
    if (/assistive access|-25211/i.test(result.stderr)) {
      throw new Error('Alfred needs Accessibility access - System Settings › Privacy & Security › Accessibility');
    }

    lastError = new Error(scriptErrorOf(result.stderr) || `osascript exited with code ${result.status}`);

    /** Anything but the flaky teardown - a network out of range, say - would only fail the same way again. */
    if (!/-1719/.test(result.stderr)) {
      throw lastError;
    }

    if (attempt < CONTROL_CENTER_ATTEMPTS) {
      await delay(CONTROL_CENTER_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}
