const mysql = require('mysql');
const cron = require('node-cron');

const hbaopenhour = parseInt(process.env.HBASTARTHOUR, 10);
const hbaendhour = parseInt(process.env.HBAENDHOUR, 10);

const connection = mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    connectTimeout: 60000, 
});

// Function to get the last day of the month
function getLastDayOfMonth(year, month) {
    return new Date(year, month, 0).getDate();
}
  
// Function to generate new data with a blank owner_id for the current month until the end of the month
function generateNewDataForCurrentMonth() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-based, so add 1 to get the current month
  
    // Calculate the last day of the current month
    const lastDayOfCurrentMonth = getLastDayOfMonth(currentYear, currentMonth);
  
    // Delete old data for the current month until the end of the month
    const currentMonthDate = new Date(currentYear, currentMonth - 1, 1); // 1st day of the current month
    const nextMonthDate = new Date(currentYear, currentMonth, 1); // 1st day of the next month
  
    const deleteQuery = 'TRUNCATE TABLE calendar ';
    connection.query(deleteQuery, (err, result) => {
      if (err) {
        console.error('Error deleting old data:', err);
      } else {
        const resetAutoIncrementQuery = 'ALTER TABLE calendar AUTO_INCREMENT = 1';
        connection.query(resetAutoIncrementQuery, (err, result) => {
          if (err) {
            console.error('Error resetting auto-increment:', err);
          } else {
            console.log('Auto-increment reset successfully.');
            
            // Generate new data for the current month until the end of the month
            const insertQuery = 'INSERT INTO calendar (date, hour, owner_id, court_id) VALUES (?, ?, ?, ?)';
            for (let courtNumber = 1; courtNumber <= 4; courtNumber++) {
              for (let day = now.getDate(); day <= lastDayOfCurrentMonth; day++) {
                for (let hour = hbaopenhour; hour <= hbaendhour; hour++) {
                  // Create a new entry for each hour in the day with a blank owner_id
                  const currentDate = new Date(currentYear, currentMonth - 1, day, hour, 0, 0);
                  connection.query(insertQuery, [currentDate, hour, null, courtNumber], (err, result) => {
                    if (err) {
                      console.error('Error generating data:', err);
                    } else {
                        //console.log('Data generated successfully for', currentDate);
                    }
                  });
                }
              } 
            }
            console.log('New data generated successfully for the current month.');
            }
            });
      }
    });
  
}
    
    

  

console.log("calendar generation file started")
console.log(hbaopenhour, hbaendhour)

// Schedule the task to run at the beginning of each month
cron.schedule('0 0 1 * *', () => {
  console.log('Running calendar generation job...');
  generateNewDataForCurrentMonth();
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log("Connected to database")
        generateNewDataForCurrentMonth();
    }
  });