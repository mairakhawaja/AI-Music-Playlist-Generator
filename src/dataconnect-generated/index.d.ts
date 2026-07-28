import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateLogData {
  generationLog_insert: GenerationLog_Key;
}

export interface CreatePlaylistData {
  playlist_insert: Playlist_Key;
}

export interface CreatePlaylistTrackData {
  playlistTrack_insert: PlaylistTrack_Key;
}

export interface CreateTrackData {
  track_insert: Track_Key;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface DeleteLogData {
  generationLog_delete?: GenerationLog_Key | null;
}

export interface DeletePlaylistData {
  playlist_delete?: Playlist_Key | null;
}

export interface DeletePlaylistTrackData {
  playlistTrack_delete?: PlaylistTrack_Key | null;
}

export interface DeleteTrackData {
  track_delete?: Track_Key | null;
}

export interface DeleteUserData {
  user_delete?: User_Key | null;
}

export interface GenerationLog_Key {
  id: UUIDString;
  __typename?: 'GenerationLog_Key';
}

export interface GetPlaylistData {
  playlist?: {
    name: string;
    description?: string | null;
  };
}

export interface GetPlaylistTrackData {
  playlistTrack?: {
    rating?: string | null;
  };
}

export interface GetTrackData {
  track?: {
    title: string;
    artist: string;
  };
}

export interface GetUserData {
  user?: {
    username: string;
    email: string;
  };
}

export interface ListMyLogsData {
  generationLogs: ({
    prompt: string;
    timestamp: TimestampString;
  })[];
}

export interface ListMyPlaylistsData {
  playlists: ({
    name: string;
  })[];
}

export interface ListPlaylistTracksData {
  playlistTracks: ({
    track: {
      title: string;
      artist: string;
    };
  })[];
}

export interface ListTracksData {
  tracks: ({
    title: string;
    artist: string;
  })[];
}

export interface ListUsersData {
  users: ({
    username: string;
  })[];
}

export interface PlaylistTrack_Key {
  id: UUIDString;
  __typename?: 'PlaylistTrack_Key';
}

export interface Playlist_Key {
  id: UUIDString;
  __typename?: 'Playlist_Key';
}

export interface Track_Key {
  id: UUIDString;
  __typename?: 'Track_Key';
}

export interface UpdatePlaylistData {
  playlist_update?: Playlist_Key | null;
}

export interface UpdatePlaylistTrackData {
  playlistTrack_update?: PlaylistTrack_Key | null;
}

export interface UpdateTrackData {
  track_update?: Track_Key | null;
}

export interface UpdateUserData {
  user_update?: User_Key | null;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateUserData, undefined>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(): MutationPromise<CreateUserData, undefined>;
export function createUser(dc: DataConnect): MutationPromise<CreateUserData, undefined>;

interface UpdateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpdateUserData, undefined>;
  operationName: string;
}
export const updateUserRef: UpdateUserRef;

export function updateUser(): MutationPromise<UpdateUserData, undefined>;
export function updateUser(dc: DataConnect): MutationPromise<UpdateUserData, undefined>;

interface DeleteUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeleteUserData, undefined>;
  operationName: string;
}
export const deleteUserRef: DeleteUserRef;

export function deleteUser(): MutationPromise<DeleteUserData, undefined>;
export function deleteUser(dc: DataConnect): MutationPromise<DeleteUserData, undefined>;

interface GetUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserData, undefined>;
  operationName: string;
}
export const getUserRef: GetUserRef;

export function getUser(options?: ExecuteQueryOptions): QueryPromise<GetUserData, undefined>;
export function getUser(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserData, undefined>;

interface ListUsersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUsersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListUsersData, undefined>;
  operationName: string;
}
export const listUsersRef: ListUsersRef;

export function listUsers(options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;
export function listUsers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface CreatePlaylistRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreatePlaylistData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreatePlaylistData, undefined>;
  operationName: string;
}
export const createPlaylistRef: CreatePlaylistRef;

export function createPlaylist(): MutationPromise<CreatePlaylistData, undefined>;
export function createPlaylist(dc: DataConnect): MutationPromise<CreatePlaylistData, undefined>;

interface UpdatePlaylistRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdatePlaylistData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpdatePlaylistData, undefined>;
  operationName: string;
}
export const updatePlaylistRef: UpdatePlaylistRef;

export function updatePlaylist(): MutationPromise<UpdatePlaylistData, undefined>;
export function updatePlaylist(dc: DataConnect): MutationPromise<UpdatePlaylistData, undefined>;

interface DeletePlaylistRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeletePlaylistData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeletePlaylistData, undefined>;
  operationName: string;
}
export const deletePlaylistRef: DeletePlaylistRef;

export function deletePlaylist(): MutationPromise<DeletePlaylistData, undefined>;
export function deletePlaylist(dc: DataConnect): MutationPromise<DeletePlaylistData, undefined>;

interface GetPlaylistRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPlaylistData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetPlaylistData, undefined>;
  operationName: string;
}
export const getPlaylistRef: GetPlaylistRef;

export function getPlaylist(options?: ExecuteQueryOptions): QueryPromise<GetPlaylistData, undefined>;
export function getPlaylist(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetPlaylistData, undefined>;

interface ListMyPlaylistsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyPlaylistsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyPlaylistsData, undefined>;
  operationName: string;
}
export const listMyPlaylistsRef: ListMyPlaylistsRef;

export function listMyPlaylists(options?: ExecuteQueryOptions): QueryPromise<ListMyPlaylistsData, undefined>;
export function listMyPlaylists(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyPlaylistsData, undefined>;

interface CreatePlaylistTrackRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreatePlaylistTrackData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreatePlaylistTrackData, undefined>;
  operationName: string;
}
export const createPlaylistTrackRef: CreatePlaylistTrackRef;

export function createPlaylistTrack(): MutationPromise<CreatePlaylistTrackData, undefined>;
export function createPlaylistTrack(dc: DataConnect): MutationPromise<CreatePlaylistTrackData, undefined>;

interface UpdatePlaylistTrackRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdatePlaylistTrackData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpdatePlaylistTrackData, undefined>;
  operationName: string;
}
export const updatePlaylistTrackRef: UpdatePlaylistTrackRef;

export function updatePlaylistTrack(): MutationPromise<UpdatePlaylistTrackData, undefined>;
export function updatePlaylistTrack(dc: DataConnect): MutationPromise<UpdatePlaylistTrackData, undefined>;

interface DeletePlaylistTrackRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeletePlaylistTrackData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeletePlaylistTrackData, undefined>;
  operationName: string;
}
export const deletePlaylistTrackRef: DeletePlaylistTrackRef;

export function deletePlaylistTrack(): MutationPromise<DeletePlaylistTrackData, undefined>;
export function deletePlaylistTrack(dc: DataConnect): MutationPromise<DeletePlaylistTrackData, undefined>;

interface GetPlaylistTrackRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPlaylistTrackData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetPlaylistTrackData, undefined>;
  operationName: string;
}
export const getPlaylistTrackRef: GetPlaylistTrackRef;

export function getPlaylistTrack(options?: ExecuteQueryOptions): QueryPromise<GetPlaylistTrackData, undefined>;
export function getPlaylistTrack(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetPlaylistTrackData, undefined>;

interface ListPlaylistTracksRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPlaylistTracksData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListPlaylistTracksData, undefined>;
  operationName: string;
}
export const listPlaylistTracksRef: ListPlaylistTracksRef;

export function listPlaylistTracks(options?: ExecuteQueryOptions): QueryPromise<ListPlaylistTracksData, undefined>;
export function listPlaylistTracks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPlaylistTracksData, undefined>;

interface CreateTrackRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateTrackData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateTrackData, undefined>;
  operationName: string;
}
export const createTrackRef: CreateTrackRef;

export function createTrack(): MutationPromise<CreateTrackData, undefined>;
export function createTrack(dc: DataConnect): MutationPromise<CreateTrackData, undefined>;

interface UpdateTrackRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateTrackData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpdateTrackData, undefined>;
  operationName: string;
}
export const updateTrackRef: UpdateTrackRef;

export function updateTrack(): MutationPromise<UpdateTrackData, undefined>;
export function updateTrack(dc: DataConnect): MutationPromise<UpdateTrackData, undefined>;

interface DeleteTrackRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteTrackData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeleteTrackData, undefined>;
  operationName: string;
}
export const deleteTrackRef: DeleteTrackRef;

export function deleteTrack(): MutationPromise<DeleteTrackData, undefined>;
export function deleteTrack(dc: DataConnect): MutationPromise<DeleteTrackData, undefined>;

interface GetTrackRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTrackData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetTrackData, undefined>;
  operationName: string;
}
export const getTrackRef: GetTrackRef;

export function getTrack(options?: ExecuteQueryOptions): QueryPromise<GetTrackData, undefined>;
export function getTrack(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetTrackData, undefined>;

interface ListTracksRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTracksData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListTracksData, undefined>;
  operationName: string;
}
export const listTracksRef: ListTracksRef;

export function listTracks(options?: ExecuteQueryOptions): QueryPromise<ListTracksData, undefined>;
export function listTracks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListTracksData, undefined>;

interface CreateLogRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateLogData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateLogData, undefined>;
  operationName: string;
}
export const createLogRef: CreateLogRef;

export function createLog(): MutationPromise<CreateLogData, undefined>;
export function createLog(dc: DataConnect): MutationPromise<CreateLogData, undefined>;

interface DeleteLogRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteLogData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeleteLogData, undefined>;
  operationName: string;
}
export const deleteLogRef: DeleteLogRef;

export function deleteLog(): MutationPromise<DeleteLogData, undefined>;
export function deleteLog(dc: DataConnect): MutationPromise<DeleteLogData, undefined>;

interface ListMyLogsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyLogsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyLogsData, undefined>;
  operationName: string;
}
export const listMyLogsRef: ListMyLogsRef;

export function listMyLogs(options?: ExecuteQueryOptions): QueryPromise<ListMyLogsData, undefined>;
export function listMyLogs(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyLogsData, undefined>;

