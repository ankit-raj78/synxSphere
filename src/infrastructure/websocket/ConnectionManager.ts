import { injectable } from 'inversify';
import { IConnectionManager, Connection } from './interfaces';

/**
 * In-memory connection manager for WebSocket connections
 */
@injectable()
export class ConnectionManager implements IConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();

  /**
   * Add a new connection
   */
  addConnection(socket: any): Connection {
    const connection: Connection = {
      socketId: socket.id,
      userId: socket.data.user.id,
      username: socket.data.user.username,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set(),
      metadata: {}
    };

    this.connections.set(socket.id, connection);

    // Track user connections
    const userSockets = this.userConnections.get(connection.userId) || new Set();
    userSockets.add(socket.id);
    this.userConnections.set(connection.userId, userSockets);

    return connection;
  }

  /**
   * Remove a connection
   */
  removeConnection(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      // Remove from user connections
      const userSockets = this.userConnections.get(connection.userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }

      this.connections.delete(socketId);
    }
  }

  /**
   * Get connection by socket ID
   */
  getConnection(socketId: string): Connection | undefined {
    return this.connections.get(socketId);
  }

  /**
   * Get all connections for a user
   */
  getConnectionsByUserId(userId: string): Connection[] {
    const socketIds = this.userConnections.get(userId) || new Set();
    return Array.from(socketIds)
      .map(socketId => this.connections.get(socketId))
      .filter(Boolean) as Connection[];
  }

  /**
   * Get all connections
   */
  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get total connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Update connection activity
   */
  updateActivity(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Add connection to room
   */
  addToRoom(socketId: string, roomId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.rooms.add(roomId);
    }
  }

  /**
   * Remove connection from room
   */
  removeFromRoom(socketId: string, roomId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.rooms.delete(roomId);
    }
  }

  /**
   * Get connections in a specific room
   */
  getConnectionsInRoom(roomId: string): Connection[] {
    return Array.from(this.connections.values())
      .filter(connection => connection.rooms.has(roomId));
  }

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections(maxInactiveMinutes: number = 30): void {
    const cutoff = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    
    for (const [socketId, connection] of this.connections.entries()) {
      if (connection.lastActivity < cutoff) {
        this.removeConnection(socketId);
      }
    }
  }
}
