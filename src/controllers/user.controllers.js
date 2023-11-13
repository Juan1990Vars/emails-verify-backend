const catchError = require('../utils/catchError');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');
const EmailCode = require('../models/EmailCode');
const jwt = require('jsonwebtoken');

const getAll = catchError(async(req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

//Desestructuramos el body en linea 12 y se encripta la contraseña en la linea 13
const create = catchError(async(req, res) => {
    const { email, password, firstName, lastName, country, image, frontBaseUrl } = req.body;
    const encriptedPassword = await bcrypt.hash(password, 10);
    const result = await User.create({
        email,
        password: encriptedPassword,
        firstName,
        lastName,
        country,
        image,
    });

    //}Aqui se genera un codigo al usuario con require crypto
    const code = require('crypto').randomBytes(32).toString('hex')

    //Almacenamos el codigo en la BD cada vez que se crea el usuario
    await EmailCode.create({
        code: code,
        userId: result.id,
    })

    //Aqui se le envia el link del codigo y se incorpora en el html
    const link = `${frontBaseUrl}/auth/verify_email/${code}`
    console.log(code);

    //Enviar correo
    await sendEmail({
		to: email, // Email del receptor
		subject: "Verificate email for user app", // asunto
		html: `
              <h1>Hello ${firstName} ${lastName}</h1>
              <b>Thanks for sign up in user app</b>
              <br>
              <a href=${link}>${link}</a>
        ` // texto
})
    return res.status(201).json(result);
});

const getOne = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if(!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async(req, res) => {
    const { id } = req.params;
    await User.destroy({ where: {id} });
    return res.sendStatus(204);
});

//Solo se desestructura lo que se quiera actualizar en update
const update = catchError(async(req, res) => {
    const { id } = req.params;
    const { firstName, lastName, country, image } = req.body;
    const result = await User.update(
        { firstName, lastName, country, image },
        { where: {id}, returning: true }
    );
    if(result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

//Para verificar el codigo que se uso correctamente por el usuario
// /users/verify/:code
const verifyCode = catchError(async(req, res) => {
    const { code } = req.params; //Para traer el codigo para verificar. desestructurar el parametro code
    const emailCode =await EmailCode.findOne({ where: {code}}); //Buscar en EmailCode con el metodo findOne y where me ayuda a buscar exactamente el dato que se le pide
    if (!emailCode)return res.status(401).json({ message: "Code not found" }); //Si no encuentra el codigo con un if mandamos y retornamos el error
    const user = await User.findByPk(emailCode.userId); //Me llega el usuario con el ID
    user.isVerified = true; //Si el codigo ya esta verificado
    await user.save(); //Lo guarda
    await emailCode.destroy(); //Elimina el codigo
    return res.json(user); //Retorna el usuario verificado
});

//Nuevo controlador para el token
const login = catchError(async(req, res) => {
    const { email, password } = req.body; //Desestructuramos
    const user = await User.findOne({ where: { email } }); //Buscamos el email y le pasamos el email
    if (!user) return res.status(401).json({ message: 'Invalid credentials' }); //Validamos de que no existe el usuario y se manda msj de error
    if (!user.isVerified) return res.status(401).json({ message: 'User not verified' }); //El usuario no es valido
    const isValid = await bcrypt.compare(password, user.password); //Comparamos la contraseña del body y botar la contraseña encriptada
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });//Mandar error en caso de que no exista la validacion del password
    
    //Se genera el TOKEN
    const token = jwt.sign(
        { user },
        process.env.TOKEN_SECRET,
        {expiresIn: '1d'},
    );
    return res.json({ user, token });
});

//Nuevo controlador para traer el usuario loggeado
const getLoggedUser = catchError(async(req, res) => {
    const user = req.user; //Traer el usuario
    return res.json(user); //Retornamos el usuario
});

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    verifyCode,
    login,
    getLoggedUser,
}
