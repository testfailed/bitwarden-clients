import { LogService } from "jslib-common/abstractions/log.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";

const maxErrors = 5;

export default class BrowserMessagingService implements MessagingService {
  private ignoreConnectionError = false;

  constructor(private logService: LogService) {}

  send(subscriber: string, arg: any = {}) {
    const message = Object.assign({}, { command: subscriber }, arg);
    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError == null) {
        return;
      }

      if (chrome.runtime.lastError.message?.indexOf("Receiving end does not exist") > -1) {
        if (this.ignoreConnectionError) {
          return;
        }

        this.logService.error(
          chrome.runtime.lastError.message +
            " (This error will now be suppressed to avoid flooding the console. If you experience any unexpected behaviour, try reloading the extension.)"
        );
        this.ignoreConnectionError = true;
        return;
      }

      this.logService.error(chrome.runtime.lastError.message);
    });
  }
}
