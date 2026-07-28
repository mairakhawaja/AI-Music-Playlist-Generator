# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createUser, updateUser, deleteUser, getUser, listUsers, createPlaylist, updatePlaylist, deletePlaylist, getPlaylist, listMyPlaylists } from '@dataconnect/generated';


// Operation CreateUser: 
const { data } = await CreateUser(dataConnect);

// Operation UpdateUser: 
const { data } = await UpdateUser(dataConnect);

// Operation DeleteUser: 
const { data } = await DeleteUser(dataConnect);

// Operation GetUser: 
const { data } = await GetUser(dataConnect);

// Operation ListUsers: 
const { data } = await ListUsers(dataConnect);

// Operation CreatePlaylist: 
const { data } = await CreatePlaylist(dataConnect);

// Operation UpdatePlaylist: 
const { data } = await UpdatePlaylist(dataConnect);

// Operation DeletePlaylist: 
const { data } = await DeletePlaylist(dataConnect);

// Operation GetPlaylist: 
const { data } = await GetPlaylist(dataConnect);

// Operation ListMyPlaylists: 
const { data } = await ListMyPlaylists(dataConnect);


```