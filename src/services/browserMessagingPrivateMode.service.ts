import { MessagingService } from "jslib-common/abstractions/messaging.service";

export default class BrowserMessagingPrivateModeService implements MessagingService {
  send(subscriber: string, arg: any = {}) {
    const message = Object.assign({}, { command: subscriber }, arg);
    (window as any).bitwardenPopupMainMessageListener(message);
    (window as any).bitwardenBackgroundMessageListener(message);
  }
}
