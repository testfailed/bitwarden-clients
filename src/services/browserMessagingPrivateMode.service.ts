import { MessagingService } from "jslib-common/abstractions/messaging.service";

export default class BrowserMessagingPrivateModeService implements MessagingService {
  constructor(private sender: 'popup' | 'background') { }

  send(subscriber: string, arg: any = {}) {
    const message = Object.assign({}, { command: subscriber }, arg);
    if (this.sender === 'popup') {
      (window as any).bitwardenBackgroundMessageListener(message);
    } else {
      (window as any).bitwardenPopupMainMessageListener(message);
    }
  }
}
