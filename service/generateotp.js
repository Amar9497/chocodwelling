const otpGenerator = require('otp-generator');

const generateOTP = (length = 4) => {
    return otpGenerator.generate(length, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false
    });
};


module.exports = generateOTP;
