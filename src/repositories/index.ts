import { AsyncStorageTransactionRepository } from './AsyncStorageTransactionRepository';
import { AsyncStorageReceiptRepository } from './AsyncStorageReceiptRepository';
import { AsyncStorageBudgetRepository } from './AsyncStorageBudgetRepository';
import { AsyncStorageDebtRepository } from './AsyncStorageDebtRepository';
import { AsyncStorageSettingsRepository } from './AsyncStorageSettingsRepository';
import { AsyncStorageTemplateRepository } from './AsyncStorageTemplateRepository';
import { AsyncStorageDataEntryRepository } from './AsyncStorageDataEntryRepository';
import { ITransactionRepository } from './ITransactionRepository';
import { IReceiptRepository } from './IReceiptRepository';
import { IBudgetRepository } from './IBudgetRepository';
import { IDebtRepository } from './IDebtRepository';
import { ISettingsRepository } from './ISettingsRepository';
import { ITemplateRepository } from './ITemplateRepository';
import { IDataEntryRepository } from './IDataEntryRepository';

// Export Interfaces
export * from './ITransactionRepository';
export * from './IReceiptRepository';
export * from './IBudgetRepository';
export * from './IDebtRepository';
export * from './ISettingsRepository';
export * from './ITemplateRepository';
export * from './IDataEntryRepository';

// Abstract Data Access Layer Instances
export const transactionRepository: ITransactionRepository = new AsyncStorageTransactionRepository();
export const receiptRepository: IReceiptRepository = new AsyncStorageReceiptRepository();
export const budgetRepository: IBudgetRepository = new AsyncStorageBudgetRepository();
export const debtRepository: IDebtRepository = new AsyncStorageDebtRepository();
export const settingsRepository: ISettingsRepository = new AsyncStorageSettingsRepository();
export const templateRepository: ITemplateRepository = new AsyncStorageTemplateRepository();
export const dataEntryRepository: IDataEntryRepository = new AsyncStorageDataEntryRepository();
