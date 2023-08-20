const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { connect } = require('http2');
const credentials = require('./credentials.js');
require('isomorphic-fetch');
require('dotenv').config();
require('./calendarGeneration');

const adminUsername = "admin";
const adminPassword = "1";
const hbaopenhour = parseInt(process.env.HBASTARTHOUR, 10);
const hbaendhour = parseInt(process.env.HBAENDHOUR, 10);

// Create connection
console.log(process.env.MYSQLHOST,  process.env.MYSQLUSER, process.env.MYSQLPASSWORD,  process.env.MYSQLDATABASE, process.env.MYSQLPORT)
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  connectTimeout: 60000, 
});

console.log("db connection created")
// Connect 
db.connect((err) => {
    if (err) {
        console.log('Error connecting to database2');
        throw err;
    }
    console.log('Connected to database');
});

console.log("nodejs app connected to mysql databse");

const transporter = nodemailer.createTransport({
    host: 'smtp.elasticemail.com',
    port: 2525, // or 587 for TLS/STARTTLS
    secure: false, // For TLS/STARTTLS set this value to true
    auth: {
      user: credentials.user,
      pass: credentials.pass
    }
});






const mailOptions = {
    from: credentials.user,
    to: 'aaravdeshmane@gmail.com',
    subject: 'Server Running',
    text: 'HBA server up and running!'
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });


console.log(credentials.user, credentials.pass)
console.log("email connection created")
console.log("email verification created")

app = express();

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '')));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



console.log("express app created")
// route handling
// all of the auth and pages
// and user admin relationships
// scheduling


function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    setTimeout(() => {
      // Code to handle OTP expiration

      console.log('OTP expired:', otp);
    }, 10 * 60 * 1000); // 10 minutes
    return otp;
}

function generateCalendarForCurrentMonth() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // January is month 0 in JavaScript
  
    // Get the number of days in the current month
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Delete old data for the current month
    const deleteQuery = 'DELETE FROM calendar WHERE YEAR(date) = ? AND MONTH(date) = ?';
    connection.query(deleteQuery, [currentYear, currentMonth], (err, result) => {
      if (err) {
        console.error('Error deleting old data:', err);
      } else {
        console.log('Old data deleted successfully!');
        // Generate new data for the current month
        const insertQuery = 'INSERT INTO calendar (date, hour, owner_id) VALUES (?, ?, ?)';
        const hoursInDay = 24;
      
        // Get the user IDs from the 'users' table
        const getUsersQuery = 'SELECT id FROM users';
        connection.query(getUsersQuery, (err, users) => {
          if (err) {
            console.error('Error fetching user IDs:', err);
          } else {
            const blankOwnerId = null; // Use null for a blank owner_id
            let userIndex = 0;

            for (let day = 1; day <= daysInMonth; day++) {
              for (let hour = 0; hour < hoursInDay; hour++) {
                // Create a new entry for each hour in the day with a user ID
                const currentDate = new Date(currentYear, currentMonth - 1, day, hour, 0, 0);
                const currentUserId = users[userIndex % users.length].id;
                connection.query(insertQuery, [currentDate, '00:00', currentUserId], (err, result) => {
                  if (err) {
                    console.error('Error generating data:', err);
                  }
                });
                userIndex++;
              }
            }
            console.log('New data generated successfully!');
          }
        });
      }
    });
}

// login things
app.get('/', function(request, response) {
    // Render login template
    response.redirect('/login');
});
app.post('/authLogin', function(request, response) {
    // Capture the input fields
    console.log("auth page entered")
    let firstname = request.body.firstname;
    let lastname = request.body.lastname;
    let password = request.body.passcode;
    console.log(firstname, lastname, password)
    // Ensure the input fields exists and are not empty
    if (firstname && lastname && password) {
        // Execute SQL query that'll select the account from the database based on the specified username and password
        db.query('SELECT * FROM users WHERE firstname = ? AND lastname = ? AND passcode = ?', [firstname, lastname, password], function(error, results, fields){
            // If there is an issue with the query, output the error
            if (error) throw error;
            // If the account exists
            if (results.length > 0) {
                // Authenticate the user
                const userId = results[0].id;

                // Store the user ID in the session
                request.session.userId = userId;
                request.session.loggedin = true;
                request.session.firstname = firstname;
                request.session.lastname = lastname;
                // Redirect to home page
                response.redirect('/home');
            } else {
                message = "User not found";
                let finalMessage = `
                <html>
                    <body style="background-color: rgb(162, 205, 248);">
                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                    </body>
                </html>
                `;
                response.status(400).send(finalMessage);
            }			
            response.end();
        });
    } else {
        message = "Please enter a first name and last name and password";
        let finalMessage = `
        <html>
            <body style="background-color: rgb(162, 205, 248);">
                <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
            </body>
        </html>
        `;
        response.send(finalMessage);
        response.end();
    }
});
app.get('/login', function(request, response) {
    response.sendFile(path.join(__dirname + '/login.html'));
});
app.get('/forgotPassword', function(request, response) {
    console.log("forgot password page entered")
    response.sendFile(path.join(__dirname + '/forgotPassword.html'));
});
app.post('/forgotPasswordAuth', function(request, response) {
    let firstname = request.body.firstname;
    let lastname = request.body.lastname;
    let email = request.body.email;
    request.session.ffirstname = firstname;
    request.session.flastname = lastname;
    request.session.femail = email;
    console.log(firstname, lastname, email)
    // Ensure the input fields exists and are not empty
    console.log("forgot password page entered")
    if (firstname && lastname && email) {
        // Execute SQL query that'll select the account from the database based on the specified username and password
        db.query('SELECT * FROM useremails WHERE email = ? AND firstname = ? AND lastname = ?', [email, firstname, lastname], function(error, results, fields) {
            // If there is an issue with the query, output the error
            if (error) throw error;
            // If the account exists
            if (results.length > 0) {
                request.session.userId = results[0].id;
                request.session.fPassword = true;
                request.session.fotp = true;
                const userId = request.session.userId;
                const otp = generateOTP();
                console.log(userId, otp)
                const now = new Date();

                // Add 10 minutes to the current time
                const futureTime = new Date(now.getTime() + 10 * 60000);
                const query = `
                INSERT INTO otp (owner_id, otp, end_time)
                SELECT ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE)
                FROM DUAL
                WHERE NOT EXISTS (
                    SELECT *
                    FROM otp
                    WHERE owner_id = ?
                    AND end_time > CURRENT_TIMESTAMP()
                )
                ON DUPLICATE KEY UPDATE otp = ?, end_time = DATE_ADD(NOW(), INTERVAL 10 MINUTE);
                `;

                db.query(query, [userId, otp, userId, otp], (err, results) => {                        if (err) {
                    // If there's an error executing the query, send an error response
                    console.log('Error executing query:', err);
                    message = "Error accessing database";
                    let finalMessage = `
                    <html>
                        <body style="background-color: rgb(162, 205, 248);">
                            <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                        </body>
                    </html>
                    `;
                    response.status(500).send(finalMessage);
                    } else {
                        console.log('OTP created for user:', userId + ' with otp:', otp);
                        // send email otp
                    }
                });
                response.redirect('/forgotOtp')
            } else {
                message = "User not found";
                let finalMessage = `
                <html>
                    <body style="background-color: rgb(162, 205, 248);">
                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                    </body>
                </html>
                `;
                response.status(500).send(finalMessage);
            }
        });
    } else {
        message = "Enter all of the information";
        let finalMessage = `
        <html>
            <body style="background-color: rgb(162, 205, 248);">
                <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
            </body>
        </html>
        `;
        response.status(500).send(finalMessage);
    }
});
app.get('/forgotOtp', function(request, response) {
    console.log("forgot otp page entered")
    if (request.session.fotp == true) {
        response.sendFile(path.join(__dirname + '/fpin.html'));
        request.session.fotp = false
        request.session.fotp1 = true
        const email = request.session.femail;
        db.query('SELECT * FROM otp WHERE owner_id = ?', [request.session.userId], (err, results) => {
            if (err) {
              console.log(err);
              response.status(500).send('Failed to retrieve OTP');
            } else {
                // fix email global local thing
                const otpsent = results[0].otp;
                console.log('Retrieved otpsent:', otpsent);

                const mailOptions = {
                    from: credentials.user,
                    to: email,
                    subject: 'OTP for your HBA account',
                    text: `Your HBA OTP is: ${otpsent}`
                };
                console.log('Constructed mailOptions:', mailOptions);
                // get rid of email verfication 
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                    console.log(error);
                    response.status(500).send('Failed to send OTP');
                    } else {
                    console.log('OTP sent:', otpsent);
                    response.status(200).send('OTP sent successfully');
                    }
                });
            }
          });
    // Render login template
    } else {
    console.log(request.session.fotp);
    response.redirect('/forgotPassword');
    }   
});
app.post('/fAuthOtp', function(request, response) {
    if (request.session.fotp1 == true) {
        request.session.fotp1 = false
        otp = request.body.p1+request.body.p2+request.body.p3+request.body.p4+request.body.p5+request.body.p6
        var checkOtp;
        db.query('SELECT * FROM otp WHERE owner_id = ?', [request.session.userId], (err, results) => {
            if (err) {
              console.log(err);
              response.status(500).send('Failed to retrieve OTP');
            } else {
                let time = results[0].end_time;
                const utcDate = new Date(time);
                const endTime = utcDate.toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  second: 'numeric',
                  hour12: true
                });

                // Get the current time
                const currentTime = new Date();
                console.log(currentTime, endTime);

                // Compare the current time with the end time
                if (currentTime <= utcDate) {
                  console.log('The current time is not past the end time.');
                  console.log(otp, results[0].otp);
                  if (results[0].otp == otp) {
                      request.session.registerPassword = true
                      response.redirect('/fPassword');
                  } else {
                      request.session.registerotp1 = false
                      request.session.registerotp = false
                      request.session.registerPassword = false
                      message = "OTP incorrect";
                      let finalMessage = `
                      <html>
                          <body style="background-color: rgb(162, 205, 248);">
                              <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                          </body>
                      </html>
                      `;
                      response.status(500).send(finalMessage);
                  }
                } else {
                  request.session.registerotp1 = false
                  request.session.registerotp = false
                  request.session.registerPassword = false
        
                  console.log('The current time is past the end time.');
                  message = "OTP expired";
                  let finalMessage = `
                  <html>
                      <body style="background-color: rgb(162, 205, 248);">
                          <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                      </body>
                  </html>
                  `;
                  response.status(500).send(finalMessage);
                  
                }
            }
        });
        
    } else {
        response.redirect('/forgotPassword');
    }
});
app.get('/fPassword', function(request, response) {
    if (request.session.fPassword == true) {
        response.sendFile(path.join(__dirname + '/fPassword.html'));
        request.session.fPassword = false
    } else {
        // Not logged in
        response.redirect('/forgotPassword');
    }
});
app.post('/fPasswordAuth', function(request, response) {
    const firstname = request.session.ffirstname;
    const lastname = request.session.flastname;
    const password = request.body.password;
    // Insert the user into the database
    // get user id
    const sql = 'UPDATE users SET passcode = ? WHERE firstname = ? AND lastname = ?';
    db.query(sql, [password, request.session.ffirstname, request.session.flastname], (err, results) => {
        if (err) {
        // If there's an error executing the query, send an error response
        console.log('Error executing query:', err);
        message = "Error updating user";
        let finalMessage = `
        <html>
            <body style="background-color: rgb(162, 205, 248);">
                <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
            </body>
        </html>
        `;
        response.status(500).send(finalMessage);
        } else {
            response.redirect('/login');
        }
    });
});


// registering things
app.post('/authRegister', function(request, response) {
    // Capture the input fields
    console.log("auth page entered")
    let firstname = request.body.firstname;
    let lastname = request.body.lastname;
    let email = request.body.email;
    request.session.firstname = firstname;
    request.session.lastname = lastname;
    request.session.email = email;
    console.log(firstname, lastname, email);
    // Ensure the input fields exists and are not empty
    if (firstname && lastname && email) {
        // Execute SQL query that'll select the account from the database based on the specified username and password
        db.query('SELECT * FROM members WHERE firstname = ? AND lastname = ? AND email = ?', [firstname, lastname, email], function(error, results, fields) {
            // If there is an issue with the query, output the error
            if (error) throw error;
            // If the account exists
            if (results.length > 0) {
                // MAKE IT SO USERS CANT REGISTER TWICE
                if (results[0].registered == 0) {
                    request.session.memberId = results[0].id;
                    request.session.registerPassword = true;
                    request.session.registerotp = true;
                    const memberId = request.session.memberId;
                    const otp = generateOTP();
                    console.log(memberId, otp)
                    const now = new Date();

                    // Add 10 minutes to the current time
                    const futureTime = new Date(now.getTime() + 10 * 60000);
                    const query = `
                    INSERT INTO otp (owner_id, otp, end_time)
                    SELECT ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE)
                    FROM DUAL
                    WHERE NOT EXISTS (
                        SELECT *
                        FROM otp
                        WHERE owner_id = ?
                        AND end_time > CURRENT_TIMESTAMP()
                    )
                    ON DUPLICATE KEY UPDATE otp = ?, end_time = DATE_ADD(NOW(), INTERVAL 10 MINUTE);
                    `;

                    db.query(query, [memberId, otp, memberId, otp], (err, results) => {                        if (err) {
                        // If there's an error executing the query, send an error response
                        console.log('Error executing query:', err);
                        message = "Error accessing database";
                        let finalMessage = `
                        <html>
                            <body style="background-color: rgb(162, 205, 248);">
                                <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                            </body>
                        </html>
                        `;
                        response.status(500).send(finalMessage);
                        } else {
                            console.log('OTP created for user:', memberId + ' with otp:', otp);
                            // send email otp
                        }
                    });
                    response.redirect('/otp')
                } else {
                    request.session.registerPassword = false;
                    request.session.registerotp = false;
                    message = "User has already registered";
                    message2 = "If you aren't a member please go to HBA to get that done first.";
                    let finalMessage = `
                    <html>
                        <body style="background-color: rgb(162, 205, 248);">
                            <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                        </body>
                    </html>
                    `;
                    response.status(400).send(finalMessage);
                }
            } else {
                message = "Member details don't match";
                message2 = "If you aren't a member please go to HBA to get that done first.";
                let finalMessage = `
                <html>
                    <body style="background-color: rgb(162, 205, 248);">
                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 20px;">${message2}</h1>
                    </body>
                </html>
                `;
                response.status(400).send(finalMessage);
            }			
            response.end();
        });
    } else {
        message = "Please enter all information";
        let finalMessage = `
        <html>
            <body style="background-color: rgb(162, 205, 248);">
                <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
            </body>
        </html>
        `;
        response.send(finalMessage);
        response.end();
    }
});
app.get('/register', function(request, response) {
    request.session.registerotp = false
    response.sendFile(path.join(__dirname + '/register.html'));
    
});
app.get('/otp', function(request, response) {
    if (request.session.registerotp == true) {
        response.sendFile(path.join(__dirname + '/pin.html'));
        request.session.registerotp = false
        request.session.registerotp1 = true
        const email = request.session.email;
        db.query('SELECT * FROM otp WHERE owner_id = ?', [request.session.memberId], (err, results) => {
            if (err) {
              console.log(err);
              response.status(500).send('Failed to retrieve OTP');
            } else {
                // fix email global local thing
                const otpsent = results[0].otp;
                console.log('Retrieved otpsent:', otpsent);

                const mailOptions = {
                    from: credentials.user,
                    to: email,
                    subject: 'OTP for your HBA account',
                    text: `Your HBA OTP is: ${otpsent}`
                };
                console.log('Constructed mailOptions:', mailOptions);
                // get rid of email verfication 
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                    console.log(error);
                    response.status(500).send('Failed to send OTP');
                    } else {
                    console.log('OTP sent:', otpsent);
                    response.status(200).send('OTP sent successfully');
                    }
                });
                // check email
                 
                // const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                // let valid;
                // if (emailRegex.test(email)) {
                //   console.log("Email is valid");
                //   valid = true;
                // } else {
                //   console.log("Email is invalid");
                //   valid = false;
                // }
                // if (valid == true) {
                //     // fix email global local thing
                //     const otpsent = results[0].otp;
                //     console.log('Retrieved otpsent:', otpsent);

                //     const mailOptions = {
                //         from: 'no.reply.hba@gmail.com',
                //         to: email,
                //         subject: 'OTP for your HBA account',
                //         text: `Your HBA OTP is: ${otpsent}`
                //     };
                //     console.log('Constructed mailOptions:', mailOptions);
                //     // get rid of email verfication 
                //     transporter.sendMail(mailOptions, function (error, info) {
                //         if (error) {
                //         console.log(error);
                //         response.status(500).send('Failed to send OTP');
                //         } else {
                //         console.log('OTP sent:', otpsent);
                //         response.status(200).send('OTP sent successfully');
                //         }
                //     });
                // } else {
                //     message = "Email is invalid";
                //     let finalMessage = `
                //     <html>
                //         <body style="background-color: rgb(162, 205, 248);">
                //             <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                //         </body>
                //     </html>
                //     `;
                //     response.status(500).send(finalMessage);
                // }
            }
          });
    // Render login template
    } else {
    console.log(request.session.registerotp);
    response.redirect('/register');
    }   
});
app.post('/registerAuthOtp', function(request, response) {
    if (request.session.registerotp1 == true) {
        request.session.registerotp1 = false
        otp = request.body.p1+request.body.p2+request.body.p3+request.body.p4+request.body.p5+request.body.p6
        db.query('SELECT * FROM otp WHERE owner_id = ?', [request.session.memberId], (err, results) => {
            if (err) {
              console.log(err);
              response.status(500).send('Database error');
            } else {
                let time = results[0].end_time;
                const utcDate = new Date(time);
                const endTime = utcDate.toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  second: 'numeric',
                  hour12: true
                });

                // Get the current time
                const currentTime = new Date();
                console.log(currentTime, endTime);

                // Compare the current time with the end time
                if (currentTime <= utcDate) {
                  console.log('The current time is not past the end time.');
                  console.log(otp, results[0].otp);
                  if (results[0].otp == otp) {
                      request.session.registerPassword = true
                      response.redirect('/registerPassword');
                  } else {
                      request.session.registerotp1 = false
                      request.session.registerotp = false
                      request.session.registerPassword = false
                      message = "OTP incorrect";
                      let finalMessage = `
                      <html>
                          <body style="background-color: rgb(162, 205, 248);">
                              <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                          </body>
                      </html>
                      `;
                      response.status(500).send(finalMessage);
                  }
                } else {
                  request.session.registerotp1 = false
                  request.session.registerotp = false
                  request.session.registerPassword = false
        
                  console.log('The current time is past the end time.');
                  message = "OTP expired";
                  let finalMessage = `
                  <html>
                      <body style="background-color: rgb(162, 205, 248);">
                          <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                      </body>
                  </html>
                  `;
                  response.status(500).send(finalMessage);
                  
                }
                
            }
        });
        
    } else {
        response.redirect('/register');
    }  
});
app.get('/registerPassword', function(request, response) {
    if (request.session.registerPassword == true) {
        response.sendFile(path.join(__dirname + '/registerPassword.html'));
        request.session.registerPassword = false
    } else {
        // Not logged in
        response.redirect('/register');
    }
});
app.post('/registerPasswordAuth', function(request, response) {
    const firstname = request.session.firstname;
    const lastname = request.session.lastname;
    const password = request.body.password;
    // Insert the user into the database
    db.query('INSERT INTO users (firstname, lastname, passcode) VALUES (?, ?, ?)', [firstname, lastname, password], (err, results) => {
        if (err) {
        // If there's an error executing the query, send an error response
        console.log('Error executing query:', err);
        message = "User already exists";
        let finalMessage = `
        <html>
            <body style="background-color: rgb(162, 205, 248);">
                <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
            </body>
        </html>
        `;
        response.status(500).send(finalMessage);
        } else {
        // User registration successful, redirect to the login page
        const memberId = request.session.memberId; // ID of the member you want to update
        console.log(memberId);
        const insertedId = results.insertId;
        let sql = 'UPDATE members SET registered = 1 WHERE id = ?';

        db.query(sql, [memberId], (error, results) => {
          if (error) {
            console.error('Error updating the entry:', error);
            message = "Error registering user";
            let finalMessage = `
            <html>
                <body style="background-color: rgb(162, 205, 248);">
                    <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                </body>
            </html>
            `;
            response.status(500).send(finalMessage);
          }
          console.log('Entry updated successfully');
        });
        
        console.log(insertedId)
        sql = 'INSERT INTO useremails SET ?';
        const emailData = {
            email: request.session.email,
            owner_id: insertedId,
            firstname: firstname,
            lastname: lastname
        };
        db.query(sql, emailData, (error, results) => {
          if (error) {
            console.error('Error updating the entry:', error);
            message = "Error registering user";
            let finalMessage = `
            <html>
                <body style="background-color: rgb(162, 205, 248);">
                    <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                </body>
            </html>
            `;
            response.status(500).send(finalMessage);
          } else {
          console.log('Entry updated successfully');
          response.redirect('/login');
          }
        });
        }
    });
});


// admin things
app.post('/authAdmin', function(request, response) {
    // Capture the input fields
    let username = request.body.username;
    let password = request.body.passcode;

    console.log("auth page entered");
    console.log(username, password);
    
    // Ensure the input fields exists and are not empty
    if (username && password) {
        // Execute SQL query that'll select the account from the database based on the specified username and password
        if (username == adminUsername && password == adminPassword) {
            request.session.loggedin = true;
            request.session.admin = true;
            response.redirect('/adminHub');
        }  else {
            message = "Incorrect username or password";
            let finalMessage = `
            <html>
                <body style="background-color: rgb(162, 205, 248);">
                    <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                </body>
            </html>
            `;
            response.send(finalMessage);
            response.end();
        }
    } else {
        message = "Please enter a username and password";
        let finalMessage = `
        <html>
            <body style="background-color: rgb(162, 205, 248);">
                <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
            </body>
        </html>
        `;
        response.send(finalMessage);
        response.end();
    }
});
app.get('/adminLogin', function(request, response) {
    response.sendFile(path.join(__dirname + '/admin.html'));
});
app.get('/adminHub', function(request, response) {
    // If the user is logged in
    if (request.session.loggedin && request.session.admin == true) {
      // Output username
      response.sendFile(path.join(__dirname + '/adminHub.html'));
      console.log("adminHub page entered")
    } else {
      // Not logged in
      response.redirect('/adminLogin');
    }
});
app.post('/addMember', function(req, res) {
    if (req.session.loggedin && req.session.admin == true) {
        const { firstname, lastname, email} = req.body;
        db.query('SELECT * FROM members WHERE firstname = ? AND lastname = ? AND email = ?', [firstname, lastname, email], (error, results) => {
            if (results.length > 0) {
                console.error('Member\'s info already exists');
                message = "Member's information already exists";
                let finalMessage = `
                <html>
                    <body style="background-color: rgb(162, 205, 248);">
                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                    </body>
                </html>
                `;
                res.status(500).send(finalMessage);
                res.end();              
            } else {
                // Execute the SQL query to insert the data into the table
                const query = 'INSERT INTO members (firstname, lastname, email, registered) VALUES (?, ?, ?, ?)';
                db.query(query, [firstname, lastname, email, 0], (error, results) => {
                    if (error) {
                    console.error('Error inserting data:', error);
                    message = "Error occured while inserting member information into members table.";
                    let finalMessage = `
                    <html>
                        <body style="background-color: rgb(162, 205, 248);">
                            <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                        </body>
                    </html>
                    `;
                    res.status(500).send(finalMessage);
                    res.end();
                    }
                    // Data inserted successfully
                    message = "Member information inserted successfully";
                    let finalMessage = `
                    <html>
                        <body style="background-color: rgb(162, 205, 248);">
                            <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                        </body>
                    </html>
                    `;
                    res.status(200).send(finalMessage);
                    res.end();
                });
            }
        });
    } else {
        // Not logged in
        res.redirect('/adminLogin');
    }
});
app.post('/deleteMember', function(req, res) {
    if (req.session.loggedin && req.session.admin == true) {
        const { firstname, lastname, email } = req.body;
        
        db.query('SELECT * FROM members WHERE firstname = ? AND lastname = ? AND email = ?', [firstname, lastname, email], (error, results) => {
            if (results.length > 0) {
                const memberId = results[0].id;
                console.log(memberId);
                // Execute the SQL query to insert the data into the table
                let query = 'DELETE FROM members WHERE id = ?';
                db.query(query, [memberId], (error, results) => {
                    if (error) {
                        console.error('Error deleting data:', error);
                        message = "Error occured while deleting member information from the members table.";
                        let finalMessage = `
                        <html>
                            <body style="background-color: rgb(162, 205, 248);">
                                <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                            </body>
                        </html>
                        `;
                        res.status(500).send(finalMessage);
                        res.end();
                    } else {
                        db.query('SELECT * FROM users WHERE firstname = ? AND lastname = ?', [firstname, lastname], (error, results) => {
                            if (results.length > 0) {
                            db.query('DELETE FROM users WHERE firstname = ? AND lastname = ?', [firstname, lastname], (err, results) => {
                                if (err) {
                                console.error('Error:', err);
                                message = "Error occured while deleting member information from the members table.";
                                let finalMessage = `
                                <html>
                                    <body style="background-color: rgb(162, 205, 248);">
                                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                                    </body>
                                </html>
                                `;
                                res.status(500).send(finalMessage);
                                res.end();
                                } else {
                                    db.query('SELECT * FROM members WHERE firstname = ? AND lastname = ? AND email = ?', [firstname, lastname, email], (error, results) => {
                                        if (results.length > 0) {
                                            db.query('DELETE FROM useremails WHERE firstname = ? AND lastname = ? AND email = ?', [email, firstname, lastname], (err, results) => {
                                                if (err) {
                                                  console.error('Error:', err);
                                                  message = "Error occured while deleting member information from the members table.";
                                                  let finalMessage = `
                                                  <html>
                                                      <body style="background-color: rgb(162, 205, 248);">
                                                          <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                                                      </body>
                                                  </html>
                                                  `;
                                                  res.status(500).send(finalMessage);
                                                  res.end();
                                                }
                                                console.log('User deleted successfully');
                                                message = "Member information deleted successfully";
                                                let finalMessage = `
                                                <html>
                                                    <body style="background-color: rgb(162, 205, 248);">
                                                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                                                    </body>
                                                </html>
                                                `;
                                                res.status(200).send(finalMessage);
                                                res.end();
                                              });
                                              
                                        } else {
                                            console.log('User deleted successfully');
                                            message = "Member information deleted successfully";
                                            let finalMessage = `
                                            <html>
                                                <body style="background-color: rgb(162, 205, 248);">
                                                    <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                                                </body>
                                            </html>
                                            `;
                                            res.status(200).send(finalMessage);
                                            res.end();
                                        }
                                    });
                                    }
                            
                                });
                            } else {
                                console.log('User deleted successfully');
                                message = "Member information deleted successfully";
                                let finalMessage = `
                                <html>
                                    <body style="background-color: rgb(162, 205, 248);">
                                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                                    </body>
                                </html>
                                `;
                                res.status(200).send(finalMessage);
                                res.end();
                            }
                        });
                    }
                });
                
            } else {
                console.error('Error deleting data:', error);
                message = "Member information does not exist";
                let finalMessage = `
                <html>
                    <body style="background-color: rgb(162, 205, 248);">
                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                    </body>
                </html>
                `;
                res.status(500).send(finalMessage);
                res.end();
            }
            });
    } else {
        // Not logged in
        res.redirect('/adminLogin');
    }
});
app.post('/memberList', function(req, res) {
    if (req.session.loggedin && req.session.admin == true) {

        db.query('SELECT * FROM members', (error, results) => {
            if (results.length > 0) {
                console.log(results);
                message = results;
                let final = `
                <html>
                    <body style="background-color: rgb(133, 186, 239);">
                    <h1 style="text-align: center; color: rgb(40, 102, 172); font-family: system-ui; font-size: 40px;">Member List</h1>
                    `;

                const registeredMap = {
                    1: 'Yes',
                    0: 'No'
                };
    
                for (let i = 0; i < message.length; i++) {
                    const registeredStatus = registeredMap[message[i].registered] || 'Unknown';    
                    final += (`<h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 20px;">Name: ${message[i].firstname} ${message[i].lastname} | Email: ${message[i].email} | Registered: ${registeredStatus} </h1>`)
                }
                final +=  `
                    </body>
                </html>
                `;
                res.status(200).send(final);
                res.end();              
            } else {
                console.log("No Member Data");
                message = "No Member Data";
                let finalMessage = `
                <html>
                    <body style="background-color: rgb(162, 205, 248);">
                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                    </body>
                </html>
                `;
                res.status(200).send(finalMessage);
                res.end(); 
            }
        });
    } else {
        // Not logged in
        res.redirect('/adminLogin');
    }
});
app.post('/userList', function(req, res) {
    if (req.session.loggedin && req.session.admin == true) {

        db.query('SELECT * FROM users', (error, results) => {
            if (results.length > 0) {
                console.log(results);
                message = results;
                let final = `
                <html>
                    <body style="background-color: rgb(133, 186, 239);">
                    <h1 style="text-align: center; color: rgb(40, 102, 172); font-family: system-ui; font-size: 40px;">User List</h1>
                    `;

    
                for (let i = 0; i < message.length; i++) {
                    final += (`<h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 20px;">${message[i].firstname} ${message[i].lastname}</h1>`)
                }
                final +=  `
                    </body>
                </html>
                `;
                res.status(200).send(final);
                res.end();              
            } else {
                console.log("No User Data");
                message = "No User Data";
                let finalMessage = `
                <html>
                    <body style="background-color: rgb(162, 205, 248);">
                        <h1 style="text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;">${message}</h1>
                    </body>
                </html>
                `;
                res.status(200).send(finalMessage);
                res.end(); 
            }
        });
    } else {
        // Not logged in
        res.redirect('/adminLogin');
    }
});


app.get('/home', function(request, response) {
    if (request.session.loggedin) {
        response.sendFile(path.join(__dirname + '/homeOptions.html'));
    } else{
        response.redirect('/login');
    }
});
app.get('/schedule', async function (request, response) {
    // make not !
    if (request.session.loggedin) {
      // Retrieve the data from the query parameter
      
      let data = request.query.data;
      console.log(data, decodeURIComponent(data))
      // Parse the JSON data back to its original format
      
      if (data == undefined) {
        data = request.session.scheduleData
      } else {
        request.session.scheduleData = data
        request.session.sdData = request.protocol + '://' + request.get('host') + request.originalUrl;
      }
      const decodedData = JSON.parse(decodeURIComponent(data));
      const dataDate = decodedData['date1']
      console.log("sdfsf")
      console.log(
        parseInt(decodedData['court1']),  // Parsed integer value
        decodedData['court1'],             // Original value
        typeof decodedData['court1']       // Data type of the value
      );
      const court1 = parseInt(decodedData['court1'])
      console.log(dataDate)
      const now = new Date(dataDate);
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      const court5 = court1;
      try {
        const results = await new Promise((resolve, reject) => {
          const query = 'SELECT * FROM calendar WHERE hour >= ? AND hour <= ? and date = ? and court_id = ?';
          db.query(query, [hbaopenhour, hbaendhour, formattedDate, court5], (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        });
        
        if (results.length > 0) {
          owners = [];
          let ownerIds = []
          for (const row of results) {
            const ownerId = row.owner_id;
            if (ownerId != null) {
              try {
                const result = await new Promise((resolve, reject) => {
                  db.query("SELECT * FROM users WHERE id = ?", [ownerId], (error, result) => {
                    if (error) {
                      reject(error);
                    } else {
                      resolve(result);
                    }
                  });
                });

                if (result.length > 0) {
                  ownerIds.push(ownerId)
                  owners.push(result[0].firstname + " " + result[0].lastname);
                } else {
                  owners.push("-"); // Replace with null if user doesn't exist
                }
              } catch (error) {
                console.log(error);
                response.status(500).send("<html><body style='background-color: rgb(162, 205, 248);'><h1 style='text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;'>Database error</h1></body></html>");
                return;
              }
            } else {
              owners.push("-"); // Replace with null if owner_id is null
            }
          }
          console.log(owners)
          console.log(ownerIds)
          function formatDate(dateString) {
            const months = [
              "January", "February", "March", "April", "May", "June", 
              "July", "August", "September", "October", "November", "December"
            ];

            const date = new Date(dateString);
            date.setDate(date.getDate() + 1); // Add 1 to the date to correct the issue with month index

            // Adjust the date to the local time zone offset
            const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));

            const day = localDate.getDate();
            const month = months[localDate.getMonth()];
            const year = localDate.getFullYear();

            let daySuffix = "th";
            if (day === 1 || day === 21 || day === 31) {
              daySuffix = "st";
            } else if (day === 2 || day === 22) {
              daySuffix = "nd";
            } else if (day === 3 || day === 23) {
              daySuffix = "rd";
            }

            return `${month} ${day}${daySuffix}, ${year}`;
          }

          const dateInString = formattedDate;
          const formattedDate1 = formatDate(dateInString);
          console.log(formattedDate1);
          console.log(request.session.userId)
          const data = {
            stime: `${hbaopenhour}:00`,
            etime: `${hbaendhour}:00`,
            itime: '60',
            owners: JSON.stringify(owners),
            ownerid: request.session.userId,
            fdate: formattedDate1,
            date: formattedDate,
            courtid: court1,
          };
          
          console.log("--------")
          console.log(owners, court1)
          response.render('schedule', { data: data });
        } else {
          response.status(500).send("<html><body style='background-color: rgb(162, 205, 248);'><h1 style='text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;'>No schedule available for month, wait for the next month</h1></body></html>");
          return;
        }
      } catch (error) {
        console.log(error);
        response.status(500).send("<html><body style='background-color: rgb(162, 205, 248);'><h1 style='text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;'>Database error</h1></body></html>");
        return;
      }
    } else {
      response.redirect('/login');
    }
});
app.get('/reserve', (req, res) => {
    if (req.session.loggedin) {
        const data = req.query.data;
        const decodedData = JSON.parse(decodeURIComponent(data));
        
        function formatHourToTime3(hour) {
            const formattedHour = hour.toString().padStart(2, '0');
            return `00:00:${formattedHour}`;
        }
        
        db.query(
            'SELECT * FROM CALENDAR WHERE date = ? AND hour = ? AND court_id = ? AND owner_id IS NULL',
            [decodedData.date, formatHourToTime3(decodedData.rtime), decodedData.court],
            (err, res5) => {
                if (res5.length > 0) {
                    req.session.resAuth = true;
                    res.render('reserve', { data: decodedData });
                } else {
                    db.query(
                        'SELECT * FROM calendar WHERE date = ? AND hour = ? AND court_id = ? AND owner_id = ?',
                        [decodedData.date, formatHourToTime3(decodedData.rtime), decodedData.court, req.session.userId],
                        (err, res6) => {
                            if (res6.length > 0) {
                                req.session.scd = true
                                req.session.sssdata = decodedData
                                res.redirect('/scheduleConfirmDeletion');
                            } else {
                                res.redirect(req.session.sdData);
                            }
                        }
                    );
                }
            }
        );
    } else {
        res.redirect('/login');
    }
});
app.post('/reserveAuth', (req, res) => {
    if (req.session.loggedin && req.session.resAuth) {
      req.session.resAuth = false
      // Retrieve the data from the query parameter
      const ownerId = req.body.userId;
      const date = req.body.date;
      const time = req.body.time;
      const court = req.body.court;
      console.log(ownerId, date, formatHourToTime3(time), court);

      const query = `
        UPDATE calendar 
        SET owner_id = ?
        WHERE date = ? AND hour = ? AND court_id = ?
      `;

      function formatHourToTime3(hour) {
        const formattedHour = hour.toString().padStart(2, '0');
        return `00:00:${formattedHour}`;
      }

      db.query('SELECT * FROM CALENDAR WHERE date = ? and hour = ? and court_id = ? and owner_id IS NULL',  [date, formatHourToTime3(time), court], (err, res5) => {
        if (res5.length > 0) {
            db.query(query, [ownerId, date, formatHourToTime3(time), court], (err, res1) => {
            if (err) {
            // Handle the error
            console.error(err);
            res.status(500).send("<html><body style='background-color: rgb(162, 205, 248);'><h1 style='text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;'>Database error</h1></body></html>");
            } else {
            if (res1.affectedRows > 0) {
                // The update was successful
                const encodedData = encodeURIComponent(decodeURIComponent(req.session.scheduleData));
                const redirectUrl = `http://localhost:3000/schedule?data=${encodedData}`;
                console.log(encodedData, decodeURIComponent(req.session.scheduleData))
                res.redirect(req.session.sdData);
            } else {
                // No rows were updated
                res.status(500).send("<html><body style='background-color: rgb(162, 205, 248);'><h1 style='text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;'>No matching records found</h1></body></html>");
            }
            }
            });
        } else {
            res.status(500).send("<html><body style='background-color: rgb(162, 205, 248);'><h1 style='text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;'>Slot already filled</h1></body></html>");
            
        }
      });
    } else {
      res.redirect('/login');
    }
});
app.get('/scheduleConfirmDeletion', (req, res) => {
    if (req.session.loggedin && req.session.scd) {
        req.session.scd = false
        req.session.dsoi = true
        const data = req.session.sssdata    
        res.render('schedConfirmDel', { data: data });
    } else {
        res.redirect('/login')
    }
});
app.post('/deleteScheduleOwnerId', (req, res) => {
    if (req.session.loggedin && req.session.dsoi) {
        req.session.dsoi = false
        date = req.body.date
        time = "00:00:"+req.body.time.toString().padStart(2, '0');
        ownerId = req.body.userId
        court = req.body.court
        console.log(date, time, ownerId, court)
        db.query('SELECT * FROM calendar WHERE date = ? and hour = ? and owner_id = ? and court_id = ?', [date, time, ownerId, court], (err, res5) => {
            if (res5 && res5.length > 0) {
                db.query('UPDATE calendar SET owner_id = ? WHERE date = ? and hour = ? and owner_id = ? and court_id = ?' , [null, date, time, ownerId, court],(err, res6) => {
                    console.log(res6.affectedRows, res6)
                    if (res6 && res6.affectedRows > 0) {
                        res.redirect(req.session.sdData);
                    } else {
                        res.status(500).send("<html><body style='background-color: rgb(162, 205, 248);'><h1 style='text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;'>Database Error</h1></body></html>");
                    }
                });
            } else {
                res.status(500).send("<html><body style='background-color: rgb(162, 205, 248);'><h1 style='text-align: center; color: rgb(50, 112, 192); font-family: system-ui; font-size: 40px;'>No matching records found</h1></body></html>");
            }
        });
    }
});
// handle 404 scenarios
app.get('/404', function(request, response) {
    response.sendFile(path.join(__dirname + '/404.html'));
});
app.use(function(req, res, next) {
    res.redirect('404');
});




app.listen(process.env.MYSQLPORT);
