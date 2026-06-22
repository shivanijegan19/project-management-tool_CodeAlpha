// If a .env file sets JWT_SECRET, that's used. Otherwise this default
// kicks in, so the app works immediately with zero setup. For a real
// production app you'd always set your own secret in .env.
module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "dev_secret_change_me_in_production",
};
