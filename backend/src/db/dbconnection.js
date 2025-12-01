import { Sequelize } from "sequelize";
import createUserModel from "../models/Usuarios";

export const dbConnection= async(database,username,password)=>{
    const sequelize = new Sequelize(database, username, password, {
        host: 'localhost',
        dialect: 'postgres'
    });

    try {
        await sequelize.authenticate();
        await createUserModel(sequelize);
        await sequelize.sync({force:true});
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}