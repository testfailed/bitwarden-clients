import { Account as BaseAccount } from "jslib-common/models/domain/account";

import { BrowserComponentState } from "./browserComponentState";
import { BrowserGroupingsComponentState } from "./browserGroupingsComponentState";
import { BrowserSendComponentState } from "./browserSendComponentState";

export class Account extends BaseAccount {
  groupings?: BrowserGroupingsComponentState;
  send?: BrowserSendComponentState;
  ciphers?: BrowserComponentState;
  sendType?: BrowserComponentState;

  constructor(init: Partial<Account>) {
    super(init);
    this.groupings = init.groupings ?? new BrowserGroupingsComponentState();
    this.send = init.send ?? new BrowserSendComponentState();
    this.ciphers = init.ciphers ?? new BrowserComponentState();
    this.sendType = init.sendType ?? new BrowserComponentState();
  }
}
