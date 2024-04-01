## URL Shortener Service (tiny-url)
### Overview

The URL Shortener Service is built using Node.js, TypeScript, and Nest.js for the application framework. It utilizes Prisma with PostgreSQL for data persistence and GraphQL, along with REST API for client-server communication.

### Features

1. **Generate Short Links**
Converts long URLs into short, unique aliases for easier sharing and memorability, using a secure hash function.

2. **Retrieve All Shortened URLs**
Fetches a list of all shortened URLs, including their original links, visit counts, and creation dates.

3. **Seamless URL Redirection**
Automatically redirects users from a shortened URL to its original long URL, ensuring a smooth user experience.

4. **Detailed URL Information**
Provides comprehensive details for a specific shortened URL, including visit statistics and redirect type.

5. **Modify Short URLs Details**
Allows updating the destination of existing short URLs, enabling corrections or changes to the original URL.

6. **Remove Short URLs**
Enables the removal of shortened URLs from the database, cleaning up unused or outdated links.

### Process Flow

URL Shortening Flow: Users submit a URL via the GraphQL or REST API endpoint. The system generates a unique short code, stores the mapping in the database, and returns the shortened URL.

![URL Shortening Flow](https://kavidu.com/dev/shortening-flow.jpg)

Redirection Flow: When a client requests a shortened URL, the system looks up the original URL from the database and redirects the client, incrementing the visit count.

![Redirection Flow](https://kavidu.com/dev/redirection-flow.jpg)

### Prerequisites

-   **Node.js**: Based on the dependencies, a minimum Node.js version of 12. x is recommended.
-   **NPM**:  A minimum version of NPM 7.x is recommended.
-   **Docker**: Docker is required to run a PostgreSQL instance locally. Ensure Docker is installed and running on your system.

### Setting Up the Application

 -  **Configure Environment Variables**:
    
    -   Copy the `.env` sample file to create your environment configuration: `cp .env.example .env`.
    -   Edit the `.env` file to suit your environment, especially the database connection details.
 -  **Start PostgreSQL with Docker**:
    
    -   Run `docker-compose up -d` to start a PostgreSQL instance as defined in the `docker-compose.yml`.
 -  **Install Dependencies**:
    
    -   Run `npm install` to install all necessary NPM packages listed in `package.json`.
 
 - ##### NPM Packages
   
   The required NPM packages and their versions are listed in`package.json` under `dependencies` and `devDependencies`. Key packages include:
   
   -   `@nestjs/*` for Nest.js framework modules.
   -   `@prisma/client` and `prisma` for database access and ORM.
   -   `graphql` and `@nestjs/graphql` for GraphQL support.
   -   `apollo-server-express` for setting up the Apollo Server with Express.
   -   `nanoid` for generating short codes.
   -   `pg` for PostgreSQL client.
   
 -  **Database Migration**:
    -   Run `npx prisma migrate dev` to apply any database migrations. 
    
 -  **Start the Application**:
    -   For development, run `npm run start:dev` to start the application.

### Running the Application

Once you've followed the setup steps, the application should be running and accessible via the URL defined in your `.env` file (typically http://localhost:8000 for local development)

### REST API Endpoints

 1.  **Create Short URL (POST)**
    Endpoint: `api/v1/tiny-url/create`
To create a new short URL.
  -   Request: Body(json)
>         {
>           "longUrl": "https://example.com",
>           "redirectType": "TEMPORARILY"
>         }

 -  Response:(json)
>         {
>           "shortUrl": "http://localhost:8000/api/v1/tiny-url/abcdefghij",
>           "redirectType": "TEMPORARILY"
>           "message": "URL created successfully",
>         }

2.  **Redirect to Original URL (GET)**
    Endpoint: `api/v1/tiny-url/shortCode`
   This endpoint is used to redirect the user to the original URL based on the short code. There's no JSON response for this; instead, the server responds with an HTTP 301 or 302 status code redirecting to the original URL.
   
3.  **Get All URLs (GET)**
    Endpoint: `api/v1/tiny-url/getAll`
    To retrieve all shortened URLs along with their details.
   -  Response:(json)
>       [
>           {
>             "shortUrl": "http://localhost:8000/api/v1/tiny-url/abcdefghij",
>             "longUrl": "https://example.com",
>             "visitCount": 5,
>             "lastVisited": "2023-03-30T12:34:56.789Z",
>             "createdAt": "2023-03-25T12:34:56.789Z",
>             "updatedAt": "2023-03-30T12:34:56.789Z"
>           }
>         ]

4.  **Get URL Details (GET)**
    Endpoint: `api/v1/tiny-url/getDetail/shortCode`
    To get detailed information about a specific shortened URL by its short code.
   -  Response:(json)
>       {
>           "shortUrl": "http://localhost:8000/api/v1/tiny-url/abcdefghij",
>           "longUrl": "https://example.com",
>           "redirectType": "TEMPORARILY",
>           "visitCount": 5,
>           "lastVisited": "2023-03-30T12:34:56.789Z",
>           "createdAt": "2023-03-25T12:34:56.789Z",
>           "updatedAt": "2023-03-30T12:34:56.789Z"
>         }

 5.  **Update URL (PATCH)**
    Endpoint: `api/v1/tiny-url/shortCode`
To update an existing shortened URL's details.
  -   Request: Body(json)
>         {
>           "longUrl": "https://newexample.com",
>           "redirectType": "PERMANENTLY"
>         }

 -  Response:(json)
>         {
>           "shortUrl": "http://localhost:8000/api/v1/tiny-url/abcdefghij",
>           "redirectType": "PERMANENTLY"
>           "message": "URL updated successfully",
>         }

6.  **Delete URL (DELETE)**
    Endpoint: `api/v1/tiny-url/shortCode`
To delete an existing shortened URL.

 -  Response:(json)
>         {
>           "message": "URL deleted successfully",
>         }

### GraphQL Operations

1.  **Get All URLs (Query)**
To retrieve all shortened URLs along with their details.

   -  Query:(graphql)

>     query GetAllUrls {
>       getAllUrls {
>         shortUrl
>         longUrl
>         redirectType
>         visitCount
>         lastVisited
>         createdAt
>         updatedAt
>       }
>     }

  -  Response:(json)

>     {
>       "data": {
>         "getAllUrls": [
>           {
>             "shortUrl": "http://localhost:8000/api/v1/tiny-url/abcdefghij",
>             "longUrl": "https://example.com",
>             "redirectType": "TEMPORARILY",
>             "visitCount": 10,
>             "lastVisited": "2024-03-30T12:00:00Z",
>             "createdAt": "2024-03-01T12:00:00Z",
>             "updatedAt": "2024-03-30T12:00:00Z"
>           }
>         ]
>       }
>     }

2.  **Get URL Details (Query)**
To get detailed information about a specific shortened URL by its short code.

   -  Query :(graphql)

>     query GetUrlDetail {
>       getUrlDetail(shortCode: "abcdefghij") {
>         shortUrl
>         longUrl
>         redirectType
>         visitCount
>         lastVisited
>         createdAt
>         updatedAt
>       }
>     }

   -  Response:(json)

>     {
>       "data": {
>         "getUrlDetail": {
>           "shortUrl": "http://localhost:8000/api/v1/tiny-url/abcdefghij",
>           "longUrl": "https://example.com",
>           "redirectType": "TEMPORARILY",
>           "visitCount": 10,
>           "lastVisited": "2024-03-30T12:00:00Z",
>           "createdAt": "2024-03-01T12:00:00Z",
>           "updatedAt": "2024-03-30T12:00:00Z"
>         }
>       }
>     }

3.  **Create Short URL (Mutation)**
To create a new short URL.

   -  Mutation:(graphql)

>     mutation CreateShortUrl {
>       createShortUrl(create: {longUrl: "https://example.com", redirectType: TEMPORARILY}) {
>         shortUrl
>         message
>       }
>     }

   -  Response:(json)

>     {
>       "data": {
>         "createShortUrl": {
>           "shortUrl": "http://localhost:8000/api/v1/tiny-url/nkml4k",
>           "message": "URL created successfully"
>         }
>       }
>     }

4.  **Update URL (Mutation)**
To update an existing shortened URL's details.

   -  Mutation:(graphql)

>     mutation UpdateUrl {
>       updateUrl(shortCode: "abcdefghij", update: {longUrl: "https://updated-example.com", redirectType: PERMANENTLY}) {
>         shortUrl
>         message
>       }
>     }

   -  Response:(json)

>     {
>       "data": {
>         "updateUrl": {
>           "shortUrl": "http://localhost:8000/api/v1/tiny-url/abcdefghij",
>           "message": "URL updated successfully"
>         }
>       }
>     }

5.  **Delete URL (Mutation)**
To delete an existing shortened URL.

   -  Mutation:(graphql)
   
>     mutation DeleteUrl {
>       deleteUrl(shortCode: "abcdefghij") 
>     }

   -  Response:(json)

>     {
>       "data": {
>         "deleteUrl": "URL deleted successfully"
>       }
>     }

These examples provide a comprehensive guide to structuring your GraphQL and REST API operations for the URL Shortener Service, covering creating, retrieving, updating, and deleting URL mappings.

### Tools Used for the Development

 - macOS
 - iTerm2
- Docker
- WebStorm
- Postman
- Google Chrom
- Prisma Studio
- Apollo Server
- git

### Used Documenting and Services

 - https://docs.nestjs.com
 - https://www.prisma.io/docs
 - https://stackedit.io
 - https://app.diagrams.net
 - https://github.com
