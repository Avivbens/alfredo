import { setTimeout as delay } from 'node:timers/promises';
import { runAppleScript } from '@alfredo/run-applescript';
import { RETRY_DELAY_MS, SOUND_MENU_LABEL, TOGGLE_ATTEMPTS } from '../config/constants';
import { ActiveMode, AlternateMode, NOISE_CANCELLATION, activeModeSchema } from '../models/alternate-mode.model';

/**
 * Listening Mode rows are ordered `[Off] Transparency [Adaptive] Noise Cancellation`,
 * so Noise Cancellation is always the last row and the rest are addressed relative to
 * it. `mode_count` is 4 only on devices that expose an explicit `Off` row.
 */
const ALTERNATE_ROW_EXPRESSIONS: Record<AlternateMode, string> = {
  [AlternateMode.ADAPTIVE]: 'nc_index - 1',
  [AlternateMode.TRANSPARENCY]: 'lm_start + (mode_count - 3)',
  [AlternateMode.OFF]: 'lm_start',
};

export function buildToggleScript(alternateMode: AlternateMode, soundMenuLabel: string = SOUND_MENU_LABEL): string {
  return `
tell application "System Events"
    tell application process "ControlCenter"
        set sound_item to a reference to (first UI element of menu bar 1 whose description starts with "${soundMenuLabel}")

        -- a menu left over from a previous run may still be closing, and clicking the
        -- menu bar item while it lingers reopens it instead of opening it fresh
        repeat 10 times
            if (count of windows) is 0 then exit repeat
            delay 0.1
        end repeat
        if (count of windows) > 0 then
            click sound_item
            repeat 20 times
                if (count of windows) is 0 then exit repeat
                delay 0.1
            end repeat
        end if

        click sound_item
        set menu_open to false
        repeat 25 times
            if (count of windows) > 0 then
                set menu_open to true
                exit repeat
            end if
            delay 0.1
        end repeat
        if not menu_open then error "could not open the ${soundMenuLabel} menu"

        -- the window appears before its rows finish rendering, so wait for a stable count
        set prev_count to -1
        repeat 30 times
            set cur_count to 0
            try
                set cur_count to count of UI elements of scroll area 1 of group 1 of window 1
            end try
            if cur_count > 0 and cur_count is prev_count then exit repeat
            set prev_count to cur_count
            delay 0.1
        end repeat

        set err_text to ""
        set active_mode to ""
        try
            set sa to a reference to scroll area 1 of group 1 of window 1
            set el_count to count of UI elements of sa

            -- Control Center exposes no title or description for these rows, so structure is the
            -- only stable anchor: sub-section headings of the expanded output device carry its
            -- AXIdentifier, and Listening Mode is the first such section holding 3-4 checkboxes.
            -- Absolute checkbox indexes are unusable - they shift with the number of output
            -- devices listed and with whether the device offers an "Off" mode.
            set lm_start to 0
            set mode_count to 0
            repeat with i from 1 to el_count
                set is_device_heading to false
                try
                    if (role of UI element i of sa) is "AXHeading" then
                        if (value of attribute "AXIdentifier" of UI element i of sa) is not missing value then
                            set is_device_heading to true
                        end if
                    end if
                end try

                if is_device_heading then
                    set run_length to 0
                    repeat with j from (i + 1) to el_count
                        set is_checkbox to false
                        try
                            if (role of UI element j of sa) is "AXCheckBox" then set is_checkbox to true
                        end try
                        if is_checkbox then
                            set run_length to run_length + 1
                        else
                            exit repeat
                        end if
                    end repeat

                    if run_length >= 3 and run_length <= 4 then
                        set lm_start to i + 1
                        set mode_count to run_length
                        exit repeat
                    end if
                end if
            end repeat

            if lm_start is 0 then error "no Listening Mode section found - make sure your headphones are the selected output device"

            set nc_index to lm_start + mode_count - 1
            set alt_index to ${ALTERNATE_ROW_EXPRESSIONS[alternateMode]}
            if alt_index is nc_index or alt_index < lm_start then error "the ${alternateMode} mode is not available on this device"

            -- keyed off Noise Cancellation itself, so the toggle is symmetric from any starting mode
            if (value of UI element nc_index of sa) is 1 then
                set target_index to alt_index
                set active_mode to "${alternateMode}"
            else
                set target_index to nc_index
                set active_mode to "${NOISE_CANCELLATION}"
            end if

            click UI element target_index of sa
            delay 0.25

            if (value of UI element target_index of sa) is not 1 then error "clicking the listening mode row had no effect"
        on error errMsg
            set err_text to errMsg
        end try

        if (count of windows) > 0 then click sound_item
        if err_text is not "" then error err_text

        return active_mode
    end tell
end tell
`.trim();
}

export async function toggleListeningMode(alternateMode: AlternateMode): Promise<ActiveMode> {
  const script = buildToggleScript(alternateMode);
  let lastError: unknown;

  for (let attempt = 1; attempt <= TOGGLE_ATTEMPTS; attempt++) {
    try {
      return activeModeSchema.parse(await runAppleScript(script));
    } catch (error) {
      lastError = error;

      if (attempt < TOGGLE_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}
