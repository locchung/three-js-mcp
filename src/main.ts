import WebSocket, { WebSocketServer } from 'ws';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Initialize WebSocket server
const wss = new WebSocketServer({ port: 8082 });
let clientConnection: WebSocket | null = null;
let sceneState: any = null;

wss.on('connection', (ws: WebSocket) => {
  console.error('Client connected');
  clientConnection = ws;

  ws.on('message', (message: string) => {
    try {
      sceneState = JSON.parse(message);
      console.error('Updated scene state:', sceneState);
    } catch (e) {
      console.error('Invalid scene state message:', message);
    }
  });

  ws.on('close', () => {
    console.error('Client disconnected');
    clientConnection = null;
    sceneState = null;
  });
});

// Initialize MCP server
const server = new Server(
  { name: "threejs_mcp_server", version: "1.0.0" },
  { capabilities: { prompts: {}, tools: {} } }
);

server.onerror = (error) => {
  console.error("[MCP Error]", error);
};

process.on("SIGINT", async () => {
  wss.close()
  await server.close();
  process.exit(0);
});

// Define MCP tools
const tools = [
  {
    name: "addObject",
    description: "Add an object to the scene",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        position: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
        color: { type: "string" }
      },
      required: ["type", "position", "color"]
    }
  },
  {
    name: "moveObject",
    description: "Move an object to a new position",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        position: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 }
      },
      required: ["id", "position"]
    }
  },
  {
    name: "removeObject",
    description: "Remove an object",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  },
  {
    name: "startRotation",
    description: "Start rotating an object around the y-axis",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },        // The ID of the object (e.g., "cube1")
        speed: { type: "number" }      // Rotation speed in radians per frame
      },
      required: ["id", "speed"]
    }
  },
  {
    name: "stopRotation",
    description: "Stop rotating an object",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }         // The ID of the object
      },
      required: ["id"]
    }
  },
  {
    name: "getSceneState",
    description: "Get the current scene state",
    inputSchema: { type: "object", properties: {} }
  }
];

const prompts = [
  {
    name: "asset-creation-strategy",
    description: "Defines the preferred strategy for creating assets in ThreeJS",
    arguments: []
  }
]

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts }));

// server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: input } = request.params;

  console.error("request: ===================", request)
  console.error("state: ===================", sceneState)

  if (name === "addObject") {
    if (!clientConnection) {
      return {
        content: [
            {
              type: "text",
              text: "No client connection available"
            }
          ]
      };
    }
    const command = { action: "addObject", ...(input as any) };
    clientConnection.send(JSON.stringify(command));
    return {
      content: [
        {
          type: "text",
          text: "sent"
        }
      ]
    };
  } else if (name === "moveObject") {
    if (!clientConnection) {
      return {
        content: [
            {
              type: "text",
              text: "No client connection available"
            }
          ]
      };
    }
    const command = { action: "moveObject", ...(input as any) };
    clientConnection.send(JSON.stringify(command));
    return {
      content: [
        {
          type: "text",
          text: "sent"
        }
      ]
    };
  } else if (name === 'removeObject') {
    if (!clientConnection) {
      return {
        content: [
            {
              type: "text",
              text: "No client connection available"
            }
          ]
      };
    }
    const command = { action: "removeObject", ...(input as any) };
    clientConnection.send(JSON.stringify(command));
    return {
      content: [
        {
          type: "text",
          text: "sent"
        }
      ]
     };
  } else if (name === "getSceneState") {
    if (sceneState) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sceneState?.data, null, 2)
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: "No scene state available"
          }
        ]
      };
    }
  } else if (name === "startRotation") {
    if (!clientConnection) {
      return {
        content: [
            {
              type: "text",
              text: "No client connection available"
            }
          ]
      };
    }
    const command = {
      action: "startRotation",
      id: input?.id,
      speed: input?.speed
    };
    clientConnection.send(JSON.stringify(command));
    return {
      content: [
        {
          type: "text",
          text: "sent"
        }
      ]
    };
  } else if (name === "stopRotation") {
    if (!clientConnection) {
      return {
        content: [
            {
              type: "text",
              text: "No client connection available"
            }
          ]
      };
    }
    const command = {
      action: "stopRotation",
      id: input?.id
    };
    clientConnection.send(JSON.stringify(command));
    return {
      content: [
        {
          type: "text",
          text: "sent"
        }
      ]
    };
  }
  return {
    content: [
      {
        type: "text",
        text: "Tool not found"
      }
    ]
  };;
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "asset-creation-strategy") {
    throw new Error("Unknown prompt");
  }
  return {
    description: "Defines the preferred strategy for creating assets in ThreeJS",
    messages: [{
      role: "assistant",
      content: {
        type: "text",
        text: `
          When creating 3D content in ThreeJS, always start by checking if integrations are available:
          0. Before anything, always check the scene from getSceneState() tool
          1. Response of getSceneState() tool always give you with the format delimited by ### format ###
             ###
              {
                [
                  {
                    id: "cube1",
                    type: "cube",
                    position: [0, 0, 0],
                    color: "red",
                    ...
                  }
                ]
              }
             ###
          2. Always find the id of the object in response of getSceneState() tool
          3. Always use the id of the object to manipulate it with other tools
        `
      }
    }]
  };
});

// Start MCP server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
