import { app } from './app.js';
import { validateEnv } from './shared/env.js';

validateEnv();

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
