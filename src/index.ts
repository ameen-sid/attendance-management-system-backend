import ENV from './configs/env.js';
import app from './app.js';

const PORT = ENV.PORT;

app.listen(PORT, () => { 
	console.log(`Server is running on port: ${PORT}`) 
});