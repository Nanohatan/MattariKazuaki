module.exports = {
    pg_client: function () {
        const { Client } = require('pg')

        const client = new Client({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME
        })
        return client
    },
    pupupu: function () {
      console.log('pupupupu')
    }
  };