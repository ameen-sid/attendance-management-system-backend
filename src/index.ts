import ENV from './configs/env.js';
import app from './app.js';
import { initCronJobs } from './services/cron.service.js';

const PORT = ENV.PORT;

app.get("/", (req, res) => {
	res.send("API is running 🚀");
});

app.listen(PORT, () => { 
	console.log(`Server is running on port: ${PORT}`);
	// Initialize Cron Jobs
	initCronJobs();
});