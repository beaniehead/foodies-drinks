const nodemailer = require("nodemailer");
const pug = require("pug");
const juice = require("juice"); // Allows you to convert html with separate styling into html with inline css
const htmlToText = require("html-to-text");
const promisify = require("es6-promisify");

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const generateHTML = (filename, options = {}) => {
  // __dirname defines starting in the folder the file is being run from, and is available to all files
  const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);
  const inline = juice(html);
  return inline;
};

exports.send = async (options) => {
  const html = generateHTML(options.filename, options);
  const mailOptions = {
    from: `Richard Todd <noreply@rtodd.com`,
    to: options.user.email,
    subject: options.subject,
    html,
    text: htmlToText.fromString(html)
  };
  const sendMail = promisify(transport.sendMail, transport);
  return sendMail(mailOptions)
};
