import { Global, Module } from '@nestjs/common';
import { LocalStorageProvider } from './local-storage.provider';
import { STORAGE_PROVIDER } from './storage.provider';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [LocalStorageProvider, { provide: STORAGE_PROVIDER, useExisting: LocalStorageProvider }, StorageService],
  exports: [StorageService, LocalStorageProvider],
})
export class StorageModule {}
