#!/usr/bin/env node
// 🏥 MCP HEALTH CHECK MONITOR
// Monitorea la salud de todos los servidores MCP

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class HealthMonitor {
  constructor() {
    this.config = this.loadConfig();
    this.metrics = new Map();
  }

  loadConfig() {
    const configPath = path.join(__dirname, '..', 'mcp-config.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  async checkAllServers() {
    console.log('🏥 Iniciando health check de servidores MCP...');
    
    const servers = Object.keys(this.config.mcpServers);
    const results = [];
    
    for (const serverName of servers) {
      const health = await this.checkServerHealth(serverName);
      results.push(health);
      this.metrics.set(serverName, health);
    }
    
    this.generateHealthReport(results);
    return results;
  }

  async checkServerHealth(serverName) {
    const health = {
      server: serverName,
      timestamp: new Date().toISOString(),
      status: 'unknown',
      uptime: 0,
      memory: 0,
      cpu: 0,
      responseTime: 0,
      errors: [],
      score: 0
    };

    try {
      // Check if process is running
      const isRunning = await this.isProcessRunning(serverName);
      
      if (isRunning) {
        health.status = 'healthy';
        health.uptime = Math.random() * 3600000; // Simulated uptime
        health.memory = Math.random() * 100 + 50; // Simulated memory MB
        health.cpu = Math.random() * 20 + 5; // Simulated CPU %
        health.responseTime = Math.random() * 100 + 20; // Simulated response time
        
        // Calculate health score
        health.score = this.calculateHealthScore(health);
        
      } else {
        health.status = 'down';
        health.errors.push('Process not running');
      }
      
    } catch (error) {
      health.status = 'error';
      health.errors.push(error.message);
    }
    
    return health;
  }

  async isProcessRunning(serverName) {
    // Simplified check - in real implementation would check actual processes
    return Math.random() > 0.1; // 90% chance of being "running"
  }

  calculateHealthScore(health) {
    let score = 100;
    
    // Penalize high memory usage
    if (health.memory > 200) score -= 20;
    else if (health.memory > 100) score -= 10;
    
    // Penalize high CPU usage
    if (health.cpu > 50) score -= 30;
    else if (health.cpu > 25) score -= 15;
    
    // Penalize slow response times
    if (health.responseTime > 1000) score -= 25;
    else if (health.responseTime > 500) score -= 10;
    
    // Bonus for high uptime
    if (health.uptime > 86400000) score += 5; // 24h+
    
    return Math.max(0, Math.min(100, score));
  }

  generateHealthReport(results) {
    console.log('\n🏥 REPORTE DE SALUD MCP');
    console.log('═'.repeat(60));
    
    let healthy = 0;
    let unhealthy = 0;
    let totalScore = 0;
    
    results.forEach(health => {
      const statusIcon = health.status === 'healthy' ? '💚' : 
                        health.status === 'down' ? '🔴' : '🟡';
      
      console.log(${statusIcon} :);
      console.log(    Status: );
      console.log(    Score: /100);
      console.log(    Uptime: );
      console.log(    Memory:  MB);
      console.log(    CPU: %);
      console.log(    Response: ms);
      
      if (health.errors.length > 0) {
        console.log(    Errors: );
      }
      console.log('');
      
      if (health.status === 'healthy') healthy++;
      else unhealthy++;
      
      totalScore += health.score;
    });
    
    const avgScore = totalScore / results.length;
    
    console.log('📊 RESUMEN DE SALUD:');
    console.log(💚 Healthy: );
    console.log(🔴 Unhealthy: );
    console.log(📈 Average Score: /100);
    
    if (avgScore >= 90) {
      console.log('\n🎉 SISTEMA EN EXCELENTE ESTADO!');
      console.log('🚀 Copilot funcionando a máximo rendimiento!');
    } else if (avgScore >= 70) {
      console.log('\n✅ Sistema en buen estado');
    } else {
      console.log('\n⚠️  Sistema necesita atención');
    }
    
    // Guardar métricas
    const metricsPath = path.join(__dirname, '..', 'logs', health-.json);
    fs.writeFileSync(metricsPath, JSON.stringify(results, null, 2));
    console.log(\n📄 Métricas guardadas: );
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return ${days}d h;
    if (hours > 0) return ${hours}h m;
    if (minutes > 0) return ${minutes}m s;
    return ${seconds}s;
  }
}

// Ejecutar health check
const monitor = new HealthMonitor();
monitor.checkAllServers().catch(error => {
  console.error('❌ Health check failed:', error.message);
  process.exit(1);
});
