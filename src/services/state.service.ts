import { Account as BaseAccount } from 'jslib-common/models/domain/account';
import { StorageOptions } from 'jslib-common/models/domain/storageOptions';
import { StateService as BaseStateService } from 'jslib-common/services/state.service';
import { StateMigrationService } from 'jslib-common/services/stateMigration.service';

import { Account } from 'src/models/account';
import { BrowserComponentState } from '../models/browserComponentState';
import { BrowserGroupingsComponentState } from '../models/browserGroupingsComponentState';
import { BrowserSendComponentState } from '../models/browserSendComponentState';
import { StateService as StateServiceAbstraction } from './abstractions/state.service';


export class StateService extends BaseStateService<Account> implements StateServiceAbstraction {

    async getBrowserGroupingComponentState(options?: StorageOptions): Promise<BrowserGroupingsComponentState> {
        return (await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskLocalOptions())))?.groupings;
    }

    async setBrowserGroupingComponentState(value: BrowserGroupingsComponentState, options?: StorageOptions): Promise<void> {
        const account = await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskLocalOptions()));
        account.groupings = value;
        await this.saveAccount(account, this.reconcileOptions(options, await this.defaultOnDiskLocalOptions()));
    }

    async getBrowserCipherComponentState(options?: StorageOptions): Promise<BrowserComponentState> {
        return (await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskLocalOptions())))?.ciphers;
    }

    async setBrowserCipherComponentState(value: BrowserComponentState, options?: StorageOptions): Promise<void> {
        const account = await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskLocalOptions()));
        account.ciphers = value;
        await this.saveAccount(account, this.reconcileOptions(options, await this.defaultOnDiskLocalOptions()));
    }

    async getBrowserSendComponentState(options?: StorageOptions): Promise<BrowserSendComponentState> {
        return (await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskLocalOptions())))?.send;
    }

    async setBrowserSendComponentState(value: BrowserSendComponentState, options?: StorageOptions): Promise<void> {
        const account = await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskLocalOptions()));
        account.send = value;
        await this.saveAccount(account, this.reconcileOptions(options, await this.defaultOnDiskLocalOptions()));
    }
    async getBrowserSendTypeComponentState(options?: StorageOptions): Promise<BrowserComponentState> {
        return (await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskLocalOptions())))?.sendType;
    }

    async setBrowserSendTypeComponentState(value: BrowserComponentState, options?: StorageOptions): Promise<void> {
        const account = await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskLocalOptions()));
        account.sendType = value;
        await this.saveAccount(account, this.reconcileOptions(options, await this.defaultOnDiskLocalOptions()));
    }

}
