Client / Server JSON Gateway Protocol (and other useful comments)

Purposes :
* Allows client / server communication using one (and only one) websocket for multiple services : auth, chat, matchmaking, friends, etc.
* Use JSON format
* Client only connects to the gateway container 
* Gateway transmits JSON data using either redis pubsub system or API calls to the specific container (depending on the containers endpoint).
* Game is not concerned. For better performances, a specific websocket directly connects client and game container
* Auth control is delegated to the gateway container (checking auth by itself or through in-depth requests) so all JSON data incoming to 'deep' containers can be considered trustful (except the auth container)

JSON data protocol :
* Destination container must be specified using the 'dc' key (destination container) so the gateway can route the data to the appropriate container. Possible values are 'auth', 'user', 'mmaking', 'chat', 'social', etc. (to be defined / modified)
* Other JSON data is at the specific container's discretion
* The container 'gateway' will complete the data going back to the client with the JS "destination" by using the same JSON keys. Websocket handling in the JS part will route data to the appropriate functions.

TODO :
* Client side :
    * Build and connect websocket as soon as client arrives
    * rewrite existing ws communication using the appropriate JSON protocol (matchmaking)
    * rewrite existing fetch/API calls so they use the ws protocol
    * adapt the 'onmessage' function so it forwards the data to the right place according to the JSON 'dc' key

* Server side :
    * Write the whole gateway container :
        * based on ASGI uvicorn server, AsyncJsonWebsocketConsumer and routing.py
        * implement auth control on ws creation (better if delegated to a deep container) : into "connect" function
        * redis pubsub writing / listening to appropriate channels
        * request system to APIrest endpoints if deep containers don't switch to redis pubsub system
        * complete the JSON data with the specified destination when sending data to the front
    * Optional : rewrite deep containers (user, auth and/or 2FA ?) so they comply to the pubsub system