export interface TablePlusConfig {
  Authenticator: string;
  ConnectionName: string;
  DatabaseEncoding: string;
  DatabaseHost: string;
  DatabaseName: string;
  DatabasePasswordMode: number;
  DatabasePath: string;
  DatabasePort: string;
  DatabaseSocket: string;
  DatabaseType: string;
  DatabaseUser: string;
  DatabaseUserRole: string;
  DatabaseWarehouse: string;
  Driver: string;
  DriverVersion: number;
  Enviroment: string;
  Favorites: string;
  GroupID: string;
  HideFunctionSection: boolean;
  ID: string;
  ItemGroups: any[];
  LazyLoadSchemaItems: boolean;
  LimitQueryRowsReturned: number;
  LimitRowsReturned: number;
  OtherOptions: any[];
  RecentUsedBackupDriverName: string;
  RecentUsedBackupGzip: boolean;
  RecentUsedBackupOptions: any[];
  RecentUsedRestoreOptions: any[];
  RecentlyOpened: string[];
  RecentlySchema: string[];
  SectionStates: string;
  ServerAddress: string;
  ServerNameIndication: string;
  ServerPasswordMode: number;
  ServerPort: string;
  ServerPrivateKeyName: string;
  ServerUser: string;
  ShowRecentlySection: boolean;
  ShowSequenceSection: boolean;
  ShowSystemSchemas: boolean;
  ShowUserDefineSection: boolean;
  StartupBashScript: string;
  StartupCommands: string;
  TlsKeyName: string;
  TlsKeyPaths: string[];
  isOverSSH: boolean;
  isUsePrivateKey: boolean;
  isUseSocket: boolean;
  statusColor: string;
  tLSMode: number;
}

export enum AuditLogFunctions {
  Collapsed = 'collapsed',
  Expanded = 'expanded',
}
