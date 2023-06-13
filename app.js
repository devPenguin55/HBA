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

const adminUsername = "admin";
const adminPassword = "1";

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







// const mailOptions = {
//     from: 'no.reply.hba@gmail.com',
//     to: 'aaravdeshmane@gmail.com',
//     subject: 'Test Email',
//     text: 'This is a test email. The server has started!'
//   };

//   transporter.sendMail(mailOptions, function(error, info) {
//     if (error) {
//       console.log(error);
//     } else {
//       console.log('Email sent: ' + info.response);
//     }
//   });


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

console.log("express app created")
// route handling
// all of the auth and pages
// and user admin relationships


function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    setTimeout(() => {
      // Code to handle OTP expiration

      console.log('OTP expired:', otp);
    }, 10 * 60 * 1000); // 10 minutes
    return otp;
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
        db.query('SELECT * FROM Users WHERE firstname = ? AND lastname = ? AND passcode = ?', [firstname, lastname, password], function(error, results, fields){
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
        db.query('SELECT * FROM UserEmails WHERE email = ?', email, function(error, results, fields) {
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
                INSERT INTO Otp (owner_id, otp, end_time)
                SELECT ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE)
                FROM DUAL
                WHERE NOT EXISTS (
                    SELECT *
                    FROM Otp
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
        db.query('SELECT * FROM Otp WHERE owner_id = ?', [request.session.userId], (err, results) => {
            if (err) {
              console.log(err);
              response.status(500).send('Failed to retrieve OTP');
            } else {
                // fix email global local thing
                const otpsent = results[0].otp;
                console.log('Retrieved otpsent:', otpsent);

                const mailOptions = {
                    from: 'no.reply.hba@gmail.com',
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
        db.query('SELECT * FROM Otp WHERE owner_id = ?', [request.session.userId], (err, results) => {
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
        db.query('SELECT * FROM Members WHERE firstname = ? AND lastname = ? AND email = ?', [firstname, lastname, email], function(error, results, fields) {
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
                    INSERT INTO Otp (owner_id, otp, end_time)
                    SELECT ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE)
                    FROM DUAL
                    WHERE NOT EXISTS (
                        SELECT *
                        FROM Otp
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
        db.query('SELECT * FROM Otp WHERE owner_id = ?', [request.session.memberId], (err, results) => {
            if (err) {
              console.log(err);
              response.status(500).send('Failed to retrieve OTP');
            } else {
                // fix email global local thing
                const otpsent = results[0].otp;
                console.log('Retrieved otpsent:', otpsent);

                const mailOptions = {
                    from: 'no.reply.hba@gmail.com',
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
        db.query('SELECT * FROM Otp WHERE owner_id = ?', [request.session.memberId], (err, results) => {
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
    db.query('INSERT INTO Users (firstname, lastname, passcode) VALUES (?, ?, ?)', [firstname, lastname, password], (err, results) => {
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
        let sql = 'UPDATE Members SET registered = 1 WHERE id = ?';

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
        sql = 'INSERT INTO UserEmails SET ?';
        const emailData = {
            email: request.session.email,
            owner_id: insertedId
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
        db.query('SELECT * FROM Members WHERE firstname = ? AND lastname = ? AND email = ?', [firstname, lastname, email], (error, results) => {
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
                const query = 'INSERT INTO Members (firstname, lastname, email, registered) VALUES (?, ?, ?, ?)';
                db.query(query, [firstname, lastname, email, 0], (error, results) => {
                    if (error) {
                    console.error('Error inserting data:', error);
                    message = "Error occured while inserting member information into Members table.";
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
        
        db.query('SELECT * FROM Members WHERE firstname = ? AND lastname = ? AND email = ?', [firstname, lastname, email], (error, results) => {
            if (results.length > 0) {
                const memberId = results[0].id;
                console.log(memberId);
                // Execute the SQL query to insert the data into the table
                let query = 'DELETE FROM Members WHERE id = ?';
                db.query(query, [memberId], (error, results) => {
                    if (error) {
                        console.error('Error deleting data:', error);
                        message = "Error occured while deleting member information from the Members table.";
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
                        db.query('SELECT * FROM Users WHERE firstname = ? AND lastname = ?', [firstname, lastname], (error, results) => {
                            if (results.length > 0) {
                            db.query('DELETE FROM Users WHERE firstname = ? AND lastname = ?', [firstname, lastname], (err, results) => {
                                if (err) {
                                console.error('Error:', err);
                                message = "Error occured while deleting member information from the Members table.";
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
                                    db.query('SELECT * FROM Members WHERE firstname = ? AND lastname = ? AND email = ?', [firstname, lastname, email], (error, results) => {
                                        if (results.length > 0) {
                                            db.query('DELETE FROM UserEmails WHERE email = ?', [email], (err, results) => {
                                                if (err) {
                                                  console.error('Error:', err);
                                                  message = "Error occured while deleting member information from the Members table.";
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

        db.query('SELECT * FROM Members', (error, results) => {
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

        db.query('SELECT * FROM Users', (error, results) => {
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
    console.log("Home Page");
});


// // handle 404 scenarios
// app.get('/404', function(request, response) {
//     response.sendFile(path.join(__dirname + '/404.html'));
// });
// app.use(function(req, res, next) {
//     res.redirect('404');
// });




app.listen(process.env.MYSQLPORT);
