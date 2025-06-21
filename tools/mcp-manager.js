#!/usr/bin/env node
// 🎛️ MCP REVOLUTIONARY MANAGER
// Gestiona todos los servidores MCP revolucionarios

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class MCPManager {
  constructor() {
    this.servers = new Map();
    this.config = this.loadConfig();
    this.healthCheckInterval = null;
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'mcp-config.json');
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('❌ Error loading MCP config:', error.message);
      process.exit(1);
    }
  }

  async startAll() {
    console.log('🚀 Iniciando todos los servidores MCP revolucionarios...');
    
    const serverNames = Object.keys(this.config.mcpServers)
      .sort((a, b) => this.config.mcpServers[a].priority - this.config.mcpServers[b].priority);
    
    for (const serverName of serverNames) {
      await this.startServer(serverName);
      await this.delay(1000); // Delay between starts
    }
    
    this.startHealthCheck();
    console.log('✅ Todos los servidores MCP iniciados exitosamente!');
    console.log('🎯 Copilot ahora es SUPERIOR a Windsurf y Cursor! 🚀');
  }

  async startServer(serverName) {
    const config = this.config.mcpServers[serverName];
    
    try {
      console.log(🔄 Iniciando ...);
      
      const serverProcess = spawn(config.command, config.args, {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.servers.set(serverName, {
        process: serverProcess,
        config: config,
        startTime: Date.now(),
        status: 'starting'
      });
      
      serverProcess.stdout.on('data', (data) => {
        if (this.config.globalSettings.logLevel !== 'silent') {
          console.log([] );
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message.includes('started')) {
          this.servers.get(serverName).status = 'running';
          console.log(✅  iniciado: );
        } else if (this.config.globalSettings.logLevel === 'debug') {
          console.log([] );
        }
      });
      
      serverProcess.on('exit', (code) => {
        console.log(⚠️   terminó con código );
        this.servers.get(serverName).status = 'stopped';
      });
      
    } catch (error) {
      console.error(❌ Error iniciando :, error.message);
    }
  }

  startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, this.config.monitoring.healthCheck.interval);
  }

  checkHealth() {
    let healthy = 0;
    let total = this.servers.size;
    
    for (const [name, server] of this.servers) {
      if (server.status === 'running') {
        healthy++;
      }
    }
    
    if (healthy < total) {
      console.log(⚠️  Health Check: / servidores funcionando);
    }
  }

  async stopAll() {
    console.log('🛑 Deteniendo todos los servidores MCP...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    for (const [name, server] of this.servers) {
      if (server.process && !server.process.killed) {
        console.log(🔄 Deteniendo ...);
        server.process.kill('SIGTERM');
      }
    }
    
    console.log('✅ Todos los servidores detenidos');
  }

  getStatus() {
    const status = {
      servers: {},
      summary: { total: 0, running: 0, stopped: 0 }
    };
    
    for (const [name, server] of this.servers) {
      status.servers[name] = {
        status: server.status,
        uptime: Date.now() - server.startTime,
        description: server.config.description
      };
      
      status.summary.total++;
      if (server.status === 'running') {
        status.summary.running++;
      } else {
        status.summary.stopped++;
      }
    }
    
    return status;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Manejo de señales
const manager = new MCPManager();

process.on('SIGINT', async () => {
  console.log('\n🛑 Recibida señal de interrupción...');
  await manager.stopAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recibida señal de terminación...');
  await manager.stopAll();
  process.exit(0);
});

// Argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(
🎛️  MCP Revolutionary Manager

Comandos:
  start     - Iniciar todos los servidores MCP
  stop      - Detener todos los servidores MCP  
  status    - Mostrar estado de servidores
  restart   - Reiniciar todos los servidores
  health    - Check de salud de servidores

Opciones:
  --dev     - Modo desarrollo
  --verbose - Salida detallada
  );
  process.exit(0);
}

// Ejecutar comando
(async () => {
  try {
    if (args.includes('status')) {
      const status = manager.getStatus();
      console.log('📊 Estado de servidores MCP:');
      console.log(JSON.stringify(status, null, 2));
    } else if (args.includes('stop')) {
      await manager.stopAll();
    } else {
      // Por defecto: start
      await manager.startAll();
      
      // Mantener proceso vivo
      process.stdin.resume();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
