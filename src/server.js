const app = require('./app');
const sequelize = require('./utils/connection');
require('./models');

const PORT = process.env.PORT || 8080;

const main = async () => {
    try {
        sequelize.sync();
        //{alter: true} va dentro del sync. Me ayuda cuando cambio datos en el models
        console.log("DB connected");
        app.listen(PORT);
        console.log(`Server running on port ${PORT}`);
    } catch (error) {
        console.log(error)
    }
}

main();
