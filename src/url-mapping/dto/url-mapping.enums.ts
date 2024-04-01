import { registerEnumType } from '@nestjs/graphql';

// Define an enum to types
export enum RedirectType {
  PERMANENTLY = 'PERMANENTLY', // a permanent redirect (HTTP 301).
  TEMPORARILY = 'TEMPORARILY', // a temporary redirect (HTTP 302).
}

// Default redirect type of the RedirectType enum.
const redirectType: RedirectType = RedirectType.TEMPORARILY;

// Register the RedirectType enum with GraphQL
registerEnumType(RedirectType, {
  name: 'RedirectType',
});
