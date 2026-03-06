import { startServer } from './src/application.js';


// Start the application server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
