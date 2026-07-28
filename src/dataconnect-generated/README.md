# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetUser*](#getuser)
  - [*ListUsers*](#listusers)
  - [*GetPlaylist*](#getplaylist)
  - [*ListMyPlaylists*](#listmyplaylists)
  - [*GetPlaylistTrack*](#getplaylisttrack)
  - [*ListPlaylistTracks*](#listplaylisttracks)
  - [*GetTrack*](#gettrack)
  - [*ListTracks*](#listtracks)
  - [*ListMyLogs*](#listmylogs)
- [**Mutations**](#mutations)
  - [*CreateUser*](#createuser)
  - [*UpdateUser*](#updateuser)
  - [*DeleteUser*](#deleteuser)
  - [*CreatePlaylist*](#createplaylist)
  - [*UpdatePlaylist*](#updateplaylist)
  - [*DeletePlaylist*](#deleteplaylist)
  - [*CreatePlaylistTrack*](#createplaylisttrack)
  - [*UpdatePlaylistTrack*](#updateplaylisttrack)
  - [*DeletePlaylistTrack*](#deleteplaylisttrack)
  - [*CreateTrack*](#createtrack)
  - [*UpdateTrack*](#updatetrack)
  - [*DeleteTrack*](#deletetrack)
  - [*CreateLog*](#createlog)
  - [*DeleteLog*](#deletelog)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetUser
You can execute the `GetUser` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUser(options?: ExecuteQueryOptions): QueryPromise<GetUserData, undefined>;

interface GetUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserData, undefined>;
}
export const getUserRef: GetUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUser(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserData, undefined>;

interface GetUserRef {
  ...
  (dc: DataConnect): QueryRef<GetUserData, undefined>;
}
export const getUserRef: GetUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserRef:
```typescript
const name = getUserRef.operationName;
console.log(name);
```

### Variables
The `GetUser` query has no variables.
### Return Type
Recall that executing the `GetUser` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserData {
  user?: {
    username: string;
    email: string;
  };
}
```
### Using `GetUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUser } from '@dataconnect/generated';


// Call the `getUser()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUser();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUser(dataConnect);

console.log(data.user);

// Or, you can use the `Promise` API.
getUser().then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetUser`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserRef } from '@dataconnect/generated';


// Call the `getUserRef()` function to get a reference to the query.
const ref = getUserRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

## ListUsers
You can execute the `ListUsers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listUsers(options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface ListUsersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUsersData, undefined>;
}
export const listUsersRef: ListUsersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listUsers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface ListUsersRef {
  ...
  (dc: DataConnect): QueryRef<ListUsersData, undefined>;
}
export const listUsersRef: ListUsersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listUsersRef:
```typescript
const name = listUsersRef.operationName;
console.log(name);
```

### Variables
The `ListUsers` query has no variables.
### Return Type
Recall that executing the `ListUsers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListUsersData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListUsersData {
  users: ({
    username: string;
  })[];
}
```
### Using `ListUsers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listUsers } from '@dataconnect/generated';


// Call the `listUsers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listUsers();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listUsers(dataConnect);

console.log(data.users);

// Or, you can use the `Promise` API.
listUsers().then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `ListUsers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listUsersRef } from '@dataconnect/generated';


// Call the `listUsersRef()` function to get a reference to the query.
const ref = listUsersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listUsersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

## GetPlaylist
You can execute the `GetPlaylist` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getPlaylist(options?: ExecuteQueryOptions): QueryPromise<GetPlaylistData, undefined>;

interface GetPlaylistRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPlaylistData, undefined>;
}
export const getPlaylistRef: GetPlaylistRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPlaylist(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetPlaylistData, undefined>;

interface GetPlaylistRef {
  ...
  (dc: DataConnect): QueryRef<GetPlaylistData, undefined>;
}
export const getPlaylistRef: GetPlaylistRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPlaylistRef:
```typescript
const name = getPlaylistRef.operationName;
console.log(name);
```

### Variables
The `GetPlaylist` query has no variables.
### Return Type
Recall that executing the `GetPlaylist` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPlaylistData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPlaylistData {
  playlist?: {
    name: string;
    description?: string | null;
  };
}
```
### Using `GetPlaylist`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPlaylist } from '@dataconnect/generated';


// Call the `getPlaylist()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPlaylist();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPlaylist(dataConnect);

console.log(data.playlist);

// Or, you can use the `Promise` API.
getPlaylist().then((response) => {
  const data = response.data;
  console.log(data.playlist);
});
```

### Using `GetPlaylist`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPlaylistRef } from '@dataconnect/generated';


// Call the `getPlaylistRef()` function to get a reference to the query.
const ref = getPlaylistRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPlaylistRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.playlist);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.playlist);
});
```

## ListMyPlaylists
You can execute the `ListMyPlaylists` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMyPlaylists(options?: ExecuteQueryOptions): QueryPromise<ListMyPlaylistsData, undefined>;

interface ListMyPlaylistsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyPlaylistsData, undefined>;
}
export const listMyPlaylistsRef: ListMyPlaylistsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyPlaylists(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyPlaylistsData, undefined>;

interface ListMyPlaylistsRef {
  ...
  (dc: DataConnect): QueryRef<ListMyPlaylistsData, undefined>;
}
export const listMyPlaylistsRef: ListMyPlaylistsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyPlaylistsRef:
```typescript
const name = listMyPlaylistsRef.operationName;
console.log(name);
```

### Variables
The `ListMyPlaylists` query has no variables.
### Return Type
Recall that executing the `ListMyPlaylists` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyPlaylistsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyPlaylistsData {
  playlists: ({
    name: string;
  })[];
}
```
### Using `ListMyPlaylists`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyPlaylists } from '@dataconnect/generated';


// Call the `listMyPlaylists()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyPlaylists();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyPlaylists(dataConnect);

console.log(data.playlists);

// Or, you can use the `Promise` API.
listMyPlaylists().then((response) => {
  const data = response.data;
  console.log(data.playlists);
});
```

### Using `ListMyPlaylists`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyPlaylistsRef } from '@dataconnect/generated';


// Call the `listMyPlaylistsRef()` function to get a reference to the query.
const ref = listMyPlaylistsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyPlaylistsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.playlists);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.playlists);
});
```

## GetPlaylistTrack
You can execute the `GetPlaylistTrack` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getPlaylistTrack(options?: ExecuteQueryOptions): QueryPromise<GetPlaylistTrackData, undefined>;

interface GetPlaylistTrackRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPlaylistTrackData, undefined>;
}
export const getPlaylistTrackRef: GetPlaylistTrackRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPlaylistTrack(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetPlaylistTrackData, undefined>;

interface GetPlaylistTrackRef {
  ...
  (dc: DataConnect): QueryRef<GetPlaylistTrackData, undefined>;
}
export const getPlaylistTrackRef: GetPlaylistTrackRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPlaylistTrackRef:
```typescript
const name = getPlaylistTrackRef.operationName;
console.log(name);
```

### Variables
The `GetPlaylistTrack` query has no variables.
### Return Type
Recall that executing the `GetPlaylistTrack` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPlaylistTrackData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPlaylistTrackData {
  playlistTrack?: {
    rating?: string | null;
  };
}
```
### Using `GetPlaylistTrack`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPlaylistTrack } from '@dataconnect/generated';


// Call the `getPlaylistTrack()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPlaylistTrack();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPlaylistTrack(dataConnect);

console.log(data.playlistTrack);

// Or, you can use the `Promise` API.
getPlaylistTrack().then((response) => {
  const data = response.data;
  console.log(data.playlistTrack);
});
```

### Using `GetPlaylistTrack`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPlaylistTrackRef } from '@dataconnect/generated';


// Call the `getPlaylistTrackRef()` function to get a reference to the query.
const ref = getPlaylistTrackRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPlaylistTrackRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.playlistTrack);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.playlistTrack);
});
```

## ListPlaylistTracks
You can execute the `ListPlaylistTracks` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listPlaylistTracks(options?: ExecuteQueryOptions): QueryPromise<ListPlaylistTracksData, undefined>;

interface ListPlaylistTracksRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPlaylistTracksData, undefined>;
}
export const listPlaylistTracksRef: ListPlaylistTracksRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPlaylistTracks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPlaylistTracksData, undefined>;

interface ListPlaylistTracksRef {
  ...
  (dc: DataConnect): QueryRef<ListPlaylistTracksData, undefined>;
}
export const listPlaylistTracksRef: ListPlaylistTracksRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPlaylistTracksRef:
```typescript
const name = listPlaylistTracksRef.operationName;
console.log(name);
```

### Variables
The `ListPlaylistTracks` query has no variables.
### Return Type
Recall that executing the `ListPlaylistTracks` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPlaylistTracksData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListPlaylistTracksData {
  playlistTracks: ({
    track: {
      title: string;
      artist: string;
    };
  })[];
}
```
### Using `ListPlaylistTracks`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPlaylistTracks } from '@dataconnect/generated';


// Call the `listPlaylistTracks()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPlaylistTracks();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPlaylistTracks(dataConnect);

console.log(data.playlistTracks);

// Or, you can use the `Promise` API.
listPlaylistTracks().then((response) => {
  const data = response.data;
  console.log(data.playlistTracks);
});
```

### Using `ListPlaylistTracks`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPlaylistTracksRef } from '@dataconnect/generated';


// Call the `listPlaylistTracksRef()` function to get a reference to the query.
const ref = listPlaylistTracksRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPlaylistTracksRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.playlistTracks);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.playlistTracks);
});
```

## GetTrack
You can execute the `GetTrack` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getTrack(options?: ExecuteQueryOptions): QueryPromise<GetTrackData, undefined>;

interface GetTrackRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTrackData, undefined>;
}
export const getTrackRef: GetTrackRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTrack(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetTrackData, undefined>;

interface GetTrackRef {
  ...
  (dc: DataConnect): QueryRef<GetTrackData, undefined>;
}
export const getTrackRef: GetTrackRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTrackRef:
```typescript
const name = getTrackRef.operationName;
console.log(name);
```

### Variables
The `GetTrack` query has no variables.
### Return Type
Recall that executing the `GetTrack` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTrackData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTrackData {
  track?: {
    title: string;
    artist: string;
  };
}
```
### Using `GetTrack`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTrack } from '@dataconnect/generated';


// Call the `getTrack()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTrack();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTrack(dataConnect);

console.log(data.track);

// Or, you can use the `Promise` API.
getTrack().then((response) => {
  const data = response.data;
  console.log(data.track);
});
```

### Using `GetTrack`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTrackRef } from '@dataconnect/generated';


// Call the `getTrackRef()` function to get a reference to the query.
const ref = getTrackRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTrackRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.track);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.track);
});
```

## ListTracks
You can execute the `ListTracks` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listTracks(options?: ExecuteQueryOptions): QueryPromise<ListTracksData, undefined>;

interface ListTracksRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTracksData, undefined>;
}
export const listTracksRef: ListTracksRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTracks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListTracksData, undefined>;

interface ListTracksRef {
  ...
  (dc: DataConnect): QueryRef<ListTracksData, undefined>;
}
export const listTracksRef: ListTracksRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTracksRef:
```typescript
const name = listTracksRef.operationName;
console.log(name);
```

### Variables
The `ListTracks` query has no variables.
### Return Type
Recall that executing the `ListTracks` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTracksData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListTracksData {
  tracks: ({
    title: string;
    artist: string;
  })[];
}
```
### Using `ListTracks`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTracks } from '@dataconnect/generated';


// Call the `listTracks()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTracks();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTracks(dataConnect);

console.log(data.tracks);

// Or, you can use the `Promise` API.
listTracks().then((response) => {
  const data = response.data;
  console.log(data.tracks);
});
```

### Using `ListTracks`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTracksRef } from '@dataconnect/generated';


// Call the `listTracksRef()` function to get a reference to the query.
const ref = listTracksRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTracksRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.tracks);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.tracks);
});
```

## ListMyLogs
You can execute the `ListMyLogs` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMyLogs(options?: ExecuteQueryOptions): QueryPromise<ListMyLogsData, undefined>;

interface ListMyLogsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyLogsData, undefined>;
}
export const listMyLogsRef: ListMyLogsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyLogs(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyLogsData, undefined>;

interface ListMyLogsRef {
  ...
  (dc: DataConnect): QueryRef<ListMyLogsData, undefined>;
}
export const listMyLogsRef: ListMyLogsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyLogsRef:
```typescript
const name = listMyLogsRef.operationName;
console.log(name);
```

### Variables
The `ListMyLogs` query has no variables.
### Return Type
Recall that executing the `ListMyLogs` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyLogsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyLogsData {
  generationLogs: ({
    prompt: string;
    timestamp: TimestampString;
  })[];
}
```
### Using `ListMyLogs`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyLogs } from '@dataconnect/generated';


// Call the `listMyLogs()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyLogs();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyLogs(dataConnect);

console.log(data.generationLogs);

// Or, you can use the `Promise` API.
listMyLogs().then((response) => {
  const data = response.data;
  console.log(data.generationLogs);
});
```

### Using `ListMyLogs`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyLogsRef } from '@dataconnect/generated';


// Call the `listMyLogsRef()` function to get a reference to the query.
const ref = listMyLogsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyLogsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.generationLogs);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.generationLogs);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateUser
You can execute the `CreateUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createUser(): MutationPromise<CreateUserData, undefined>;

interface CreateUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateUserData, undefined>;
}
export const createUserRef: CreateUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUser(dc: DataConnect): MutationPromise<CreateUserData, undefined>;

interface CreateUserRef {
  ...
  (dc: DataConnect): MutationRef<CreateUserData, undefined>;
}
export const createUserRef: CreateUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserRef:
```typescript
const name = createUserRef.operationName;
console.log(name);
```

### Variables
The `CreateUser` mutation has no variables.
### Return Type
Recall that executing the `CreateUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserData {
  user_insert: User_Key;
}
```
### Using `CreateUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUser } from '@dataconnect/generated';


// Call the `createUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUser();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUser(dataConnect);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
createUser().then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

### Using `CreateUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserRef } from '@dataconnect/generated';


// Call the `createUserRef()` function to get a reference to the mutation.
const ref = createUserRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

## UpdateUser
You can execute the `UpdateUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateUser(): MutationPromise<UpdateUserData, undefined>;

interface UpdateUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateUserData, undefined>;
}
export const updateUserRef: UpdateUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateUser(dc: DataConnect): MutationPromise<UpdateUserData, undefined>;

interface UpdateUserRef {
  ...
  (dc: DataConnect): MutationRef<UpdateUserData, undefined>;
}
export const updateUserRef: UpdateUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateUserRef:
```typescript
const name = updateUserRef.operationName;
console.log(name);
```

### Variables
The `UpdateUser` mutation has no variables.
### Return Type
Recall that executing the `UpdateUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateUserData {
  user_update?: User_Key | null;
}
```
### Using `UpdateUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateUser } from '@dataconnect/generated';


// Call the `updateUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateUser();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateUser(dataConnect);

console.log(data.user_update);

// Or, you can use the `Promise` API.
updateUser().then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

### Using `UpdateUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateUserRef } from '@dataconnect/generated';


// Call the `updateUserRef()` function to get a reference to the mutation.
const ref = updateUserRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateUserRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

## DeleteUser
You can execute the `DeleteUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteUser(): MutationPromise<DeleteUserData, undefined>;

interface DeleteUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteUserData, undefined>;
}
export const deleteUserRef: DeleteUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteUser(dc: DataConnect): MutationPromise<DeleteUserData, undefined>;

interface DeleteUserRef {
  ...
  (dc: DataConnect): MutationRef<DeleteUserData, undefined>;
}
export const deleteUserRef: DeleteUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteUserRef:
```typescript
const name = deleteUserRef.operationName;
console.log(name);
```

### Variables
The `DeleteUser` mutation has no variables.
### Return Type
Recall that executing the `DeleteUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteUserData {
  user_delete?: User_Key | null;
}
```
### Using `DeleteUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteUser } from '@dataconnect/generated';


// Call the `deleteUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteUser();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteUser(dataConnect);

console.log(data.user_delete);

// Or, you can use the `Promise` API.
deleteUser().then((response) => {
  const data = response.data;
  console.log(data.user_delete);
});
```

### Using `DeleteUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteUserRef } from '@dataconnect/generated';


// Call the `deleteUserRef()` function to get a reference to the mutation.
const ref = deleteUserRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteUserRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_delete);
});
```

## CreatePlaylist
You can execute the `CreatePlaylist` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createPlaylist(): MutationPromise<CreatePlaylistData, undefined>;

interface CreatePlaylistRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreatePlaylistData, undefined>;
}
export const createPlaylistRef: CreatePlaylistRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createPlaylist(dc: DataConnect): MutationPromise<CreatePlaylistData, undefined>;

interface CreatePlaylistRef {
  ...
  (dc: DataConnect): MutationRef<CreatePlaylistData, undefined>;
}
export const createPlaylistRef: CreatePlaylistRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPlaylistRef:
```typescript
const name = createPlaylistRef.operationName;
console.log(name);
```

### Variables
The `CreatePlaylist` mutation has no variables.
### Return Type
Recall that executing the `CreatePlaylist` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePlaylistData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePlaylistData {
  playlist_insert: Playlist_Key;
}
```
### Using `CreatePlaylist`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createPlaylist } from '@dataconnect/generated';


// Call the `createPlaylist()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createPlaylist();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createPlaylist(dataConnect);

console.log(data.playlist_insert);

// Or, you can use the `Promise` API.
createPlaylist().then((response) => {
  const data = response.data;
  console.log(data.playlist_insert);
});
```

### Using `CreatePlaylist`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPlaylistRef } from '@dataconnect/generated';


// Call the `createPlaylistRef()` function to get a reference to the mutation.
const ref = createPlaylistRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPlaylistRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.playlist_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.playlist_insert);
});
```

## UpdatePlaylist
You can execute the `UpdatePlaylist` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updatePlaylist(): MutationPromise<UpdatePlaylistData, undefined>;

interface UpdatePlaylistRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdatePlaylistData, undefined>;
}
export const updatePlaylistRef: UpdatePlaylistRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updatePlaylist(dc: DataConnect): MutationPromise<UpdatePlaylistData, undefined>;

interface UpdatePlaylistRef {
  ...
  (dc: DataConnect): MutationRef<UpdatePlaylistData, undefined>;
}
export const updatePlaylistRef: UpdatePlaylistRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updatePlaylistRef:
```typescript
const name = updatePlaylistRef.operationName;
console.log(name);
```

### Variables
The `UpdatePlaylist` mutation has no variables.
### Return Type
Recall that executing the `UpdatePlaylist` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdatePlaylistData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdatePlaylistData {
  playlist_update?: Playlist_Key | null;
}
```
### Using `UpdatePlaylist`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updatePlaylist } from '@dataconnect/generated';


// Call the `updatePlaylist()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updatePlaylist();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updatePlaylist(dataConnect);

console.log(data.playlist_update);

// Or, you can use the `Promise` API.
updatePlaylist().then((response) => {
  const data = response.data;
  console.log(data.playlist_update);
});
```

### Using `UpdatePlaylist`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updatePlaylistRef } from '@dataconnect/generated';


// Call the `updatePlaylistRef()` function to get a reference to the mutation.
const ref = updatePlaylistRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updatePlaylistRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.playlist_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.playlist_update);
});
```

## DeletePlaylist
You can execute the `DeletePlaylist` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deletePlaylist(): MutationPromise<DeletePlaylistData, undefined>;

interface DeletePlaylistRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeletePlaylistData, undefined>;
}
export const deletePlaylistRef: DeletePlaylistRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deletePlaylist(dc: DataConnect): MutationPromise<DeletePlaylistData, undefined>;

interface DeletePlaylistRef {
  ...
  (dc: DataConnect): MutationRef<DeletePlaylistData, undefined>;
}
export const deletePlaylistRef: DeletePlaylistRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deletePlaylistRef:
```typescript
const name = deletePlaylistRef.operationName;
console.log(name);
```

### Variables
The `DeletePlaylist` mutation has no variables.
### Return Type
Recall that executing the `DeletePlaylist` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeletePlaylistData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeletePlaylistData {
  playlist_delete?: Playlist_Key | null;
}
```
### Using `DeletePlaylist`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deletePlaylist } from '@dataconnect/generated';


// Call the `deletePlaylist()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deletePlaylist();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deletePlaylist(dataConnect);

console.log(data.playlist_delete);

// Or, you can use the `Promise` API.
deletePlaylist().then((response) => {
  const data = response.data;
  console.log(data.playlist_delete);
});
```

### Using `DeletePlaylist`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deletePlaylistRef } from '@dataconnect/generated';


// Call the `deletePlaylistRef()` function to get a reference to the mutation.
const ref = deletePlaylistRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deletePlaylistRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.playlist_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.playlist_delete);
});
```

## CreatePlaylistTrack
You can execute the `CreatePlaylistTrack` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createPlaylistTrack(): MutationPromise<CreatePlaylistTrackData, undefined>;

interface CreatePlaylistTrackRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreatePlaylistTrackData, undefined>;
}
export const createPlaylistTrackRef: CreatePlaylistTrackRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createPlaylistTrack(dc: DataConnect): MutationPromise<CreatePlaylistTrackData, undefined>;

interface CreatePlaylistTrackRef {
  ...
  (dc: DataConnect): MutationRef<CreatePlaylistTrackData, undefined>;
}
export const createPlaylistTrackRef: CreatePlaylistTrackRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPlaylistTrackRef:
```typescript
const name = createPlaylistTrackRef.operationName;
console.log(name);
```

### Variables
The `CreatePlaylistTrack` mutation has no variables.
### Return Type
Recall that executing the `CreatePlaylistTrack` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePlaylistTrackData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePlaylistTrackData {
  playlistTrack_insert: PlaylistTrack_Key;
}
```
### Using `CreatePlaylistTrack`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createPlaylistTrack } from '@dataconnect/generated';


// Call the `createPlaylistTrack()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createPlaylistTrack();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createPlaylistTrack(dataConnect);

console.log(data.playlistTrack_insert);

// Or, you can use the `Promise` API.
createPlaylistTrack().then((response) => {
  const data = response.data;
  console.log(data.playlistTrack_insert);
});
```

### Using `CreatePlaylistTrack`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPlaylistTrackRef } from '@dataconnect/generated';


// Call the `createPlaylistTrackRef()` function to get a reference to the mutation.
const ref = createPlaylistTrackRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPlaylistTrackRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.playlistTrack_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.playlistTrack_insert);
});
```

## UpdatePlaylistTrack
You can execute the `UpdatePlaylistTrack` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updatePlaylistTrack(): MutationPromise<UpdatePlaylistTrackData, undefined>;

interface UpdatePlaylistTrackRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdatePlaylistTrackData, undefined>;
}
export const updatePlaylistTrackRef: UpdatePlaylistTrackRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updatePlaylistTrack(dc: DataConnect): MutationPromise<UpdatePlaylistTrackData, undefined>;

interface UpdatePlaylistTrackRef {
  ...
  (dc: DataConnect): MutationRef<UpdatePlaylistTrackData, undefined>;
}
export const updatePlaylistTrackRef: UpdatePlaylistTrackRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updatePlaylistTrackRef:
```typescript
const name = updatePlaylistTrackRef.operationName;
console.log(name);
```

### Variables
The `UpdatePlaylistTrack` mutation has no variables.
### Return Type
Recall that executing the `UpdatePlaylistTrack` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdatePlaylistTrackData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdatePlaylistTrackData {
  playlistTrack_update?: PlaylistTrack_Key | null;
}
```
### Using `UpdatePlaylistTrack`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updatePlaylistTrack } from '@dataconnect/generated';


// Call the `updatePlaylistTrack()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updatePlaylistTrack();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updatePlaylistTrack(dataConnect);

console.log(data.playlistTrack_update);

// Or, you can use the `Promise` API.
updatePlaylistTrack().then((response) => {
  const data = response.data;
  console.log(data.playlistTrack_update);
});
```

### Using `UpdatePlaylistTrack`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updatePlaylistTrackRef } from '@dataconnect/generated';


// Call the `updatePlaylistTrackRef()` function to get a reference to the mutation.
const ref = updatePlaylistTrackRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updatePlaylistTrackRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.playlistTrack_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.playlistTrack_update);
});
```

## DeletePlaylistTrack
You can execute the `DeletePlaylistTrack` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deletePlaylistTrack(): MutationPromise<DeletePlaylistTrackData, undefined>;

interface DeletePlaylistTrackRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeletePlaylistTrackData, undefined>;
}
export const deletePlaylistTrackRef: DeletePlaylistTrackRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deletePlaylistTrack(dc: DataConnect): MutationPromise<DeletePlaylistTrackData, undefined>;

interface DeletePlaylistTrackRef {
  ...
  (dc: DataConnect): MutationRef<DeletePlaylistTrackData, undefined>;
}
export const deletePlaylistTrackRef: DeletePlaylistTrackRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deletePlaylistTrackRef:
```typescript
const name = deletePlaylistTrackRef.operationName;
console.log(name);
```

### Variables
The `DeletePlaylistTrack` mutation has no variables.
### Return Type
Recall that executing the `DeletePlaylistTrack` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeletePlaylistTrackData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeletePlaylistTrackData {
  playlistTrack_delete?: PlaylistTrack_Key | null;
}
```
### Using `DeletePlaylistTrack`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deletePlaylistTrack } from '@dataconnect/generated';


// Call the `deletePlaylistTrack()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deletePlaylistTrack();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deletePlaylistTrack(dataConnect);

console.log(data.playlistTrack_delete);

// Or, you can use the `Promise` API.
deletePlaylistTrack().then((response) => {
  const data = response.data;
  console.log(data.playlistTrack_delete);
});
```

### Using `DeletePlaylistTrack`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deletePlaylistTrackRef } from '@dataconnect/generated';


// Call the `deletePlaylistTrackRef()` function to get a reference to the mutation.
const ref = deletePlaylistTrackRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deletePlaylistTrackRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.playlistTrack_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.playlistTrack_delete);
});
```

## CreateTrack
You can execute the `CreateTrack` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createTrack(): MutationPromise<CreateTrackData, undefined>;

interface CreateTrackRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateTrackData, undefined>;
}
export const createTrackRef: CreateTrackRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createTrack(dc: DataConnect): MutationPromise<CreateTrackData, undefined>;

interface CreateTrackRef {
  ...
  (dc: DataConnect): MutationRef<CreateTrackData, undefined>;
}
export const createTrackRef: CreateTrackRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createTrackRef:
```typescript
const name = createTrackRef.operationName;
console.log(name);
```

### Variables
The `CreateTrack` mutation has no variables.
### Return Type
Recall that executing the `CreateTrack` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateTrackData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateTrackData {
  track_insert: Track_Key;
}
```
### Using `CreateTrack`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createTrack } from '@dataconnect/generated';


// Call the `createTrack()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createTrack();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createTrack(dataConnect);

console.log(data.track_insert);

// Or, you can use the `Promise` API.
createTrack().then((response) => {
  const data = response.data;
  console.log(data.track_insert);
});
```

### Using `CreateTrack`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createTrackRef } from '@dataconnect/generated';


// Call the `createTrackRef()` function to get a reference to the mutation.
const ref = createTrackRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createTrackRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.track_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.track_insert);
});
```

## UpdateTrack
You can execute the `UpdateTrack` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateTrack(): MutationPromise<UpdateTrackData, undefined>;

interface UpdateTrackRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateTrackData, undefined>;
}
export const updateTrackRef: UpdateTrackRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateTrack(dc: DataConnect): MutationPromise<UpdateTrackData, undefined>;

interface UpdateTrackRef {
  ...
  (dc: DataConnect): MutationRef<UpdateTrackData, undefined>;
}
export const updateTrackRef: UpdateTrackRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateTrackRef:
```typescript
const name = updateTrackRef.operationName;
console.log(name);
```

### Variables
The `UpdateTrack` mutation has no variables.
### Return Type
Recall that executing the `UpdateTrack` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateTrackData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateTrackData {
  track_update?: Track_Key | null;
}
```
### Using `UpdateTrack`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateTrack } from '@dataconnect/generated';


// Call the `updateTrack()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateTrack();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateTrack(dataConnect);

console.log(data.track_update);

// Or, you can use the `Promise` API.
updateTrack().then((response) => {
  const data = response.data;
  console.log(data.track_update);
});
```

### Using `UpdateTrack`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateTrackRef } from '@dataconnect/generated';


// Call the `updateTrackRef()` function to get a reference to the mutation.
const ref = updateTrackRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateTrackRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.track_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.track_update);
});
```

## DeleteTrack
You can execute the `DeleteTrack` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteTrack(): MutationPromise<DeleteTrackData, undefined>;

interface DeleteTrackRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteTrackData, undefined>;
}
export const deleteTrackRef: DeleteTrackRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteTrack(dc: DataConnect): MutationPromise<DeleteTrackData, undefined>;

interface DeleteTrackRef {
  ...
  (dc: DataConnect): MutationRef<DeleteTrackData, undefined>;
}
export const deleteTrackRef: DeleteTrackRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteTrackRef:
```typescript
const name = deleteTrackRef.operationName;
console.log(name);
```

### Variables
The `DeleteTrack` mutation has no variables.
### Return Type
Recall that executing the `DeleteTrack` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteTrackData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteTrackData {
  track_delete?: Track_Key | null;
}
```
### Using `DeleteTrack`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteTrack } from '@dataconnect/generated';


// Call the `deleteTrack()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteTrack();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteTrack(dataConnect);

console.log(data.track_delete);

// Or, you can use the `Promise` API.
deleteTrack().then((response) => {
  const data = response.data;
  console.log(data.track_delete);
});
```

### Using `DeleteTrack`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteTrackRef } from '@dataconnect/generated';


// Call the `deleteTrackRef()` function to get a reference to the mutation.
const ref = deleteTrackRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteTrackRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.track_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.track_delete);
});
```

## CreateLog
You can execute the `CreateLog` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createLog(): MutationPromise<CreateLogData, undefined>;

interface CreateLogRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateLogData, undefined>;
}
export const createLogRef: CreateLogRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createLog(dc: DataConnect): MutationPromise<CreateLogData, undefined>;

interface CreateLogRef {
  ...
  (dc: DataConnect): MutationRef<CreateLogData, undefined>;
}
export const createLogRef: CreateLogRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createLogRef:
```typescript
const name = createLogRef.operationName;
console.log(name);
```

### Variables
The `CreateLog` mutation has no variables.
### Return Type
Recall that executing the `CreateLog` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateLogData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateLogData {
  generationLog_insert: GenerationLog_Key;
}
```
### Using `CreateLog`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createLog } from '@dataconnect/generated';


// Call the `createLog()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createLog();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createLog(dataConnect);

console.log(data.generationLog_insert);

// Or, you can use the `Promise` API.
createLog().then((response) => {
  const data = response.data;
  console.log(data.generationLog_insert);
});
```

### Using `CreateLog`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createLogRef } from '@dataconnect/generated';


// Call the `createLogRef()` function to get a reference to the mutation.
const ref = createLogRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createLogRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.generationLog_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.generationLog_insert);
});
```

## DeleteLog
You can execute the `DeleteLog` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteLog(): MutationPromise<DeleteLogData, undefined>;

interface DeleteLogRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteLogData, undefined>;
}
export const deleteLogRef: DeleteLogRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteLog(dc: DataConnect): MutationPromise<DeleteLogData, undefined>;

interface DeleteLogRef {
  ...
  (dc: DataConnect): MutationRef<DeleteLogData, undefined>;
}
export const deleteLogRef: DeleteLogRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteLogRef:
```typescript
const name = deleteLogRef.operationName;
console.log(name);
```

### Variables
The `DeleteLog` mutation has no variables.
### Return Type
Recall that executing the `DeleteLog` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteLogData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteLogData {
  generationLog_delete?: GenerationLog_Key | null;
}
```
### Using `DeleteLog`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteLog } from '@dataconnect/generated';


// Call the `deleteLog()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteLog();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteLog(dataConnect);

console.log(data.generationLog_delete);

// Or, you can use the `Promise` API.
deleteLog().then((response) => {
  const data = response.data;
  console.log(data.generationLog_delete);
});
```

### Using `DeleteLog`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteLogRef } from '@dataconnect/generated';


// Call the `deleteLogRef()` function to get a reference to the mutation.
const ref = deleteLogRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteLogRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.generationLog_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.generationLog_delete);
});
```

