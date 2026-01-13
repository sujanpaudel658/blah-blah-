// Validator utility example
module.exports = {
  isEmail: (email) => {
    // Simple email validation
    return /\S+@\S+\.\S+/.test(email);
  }
};