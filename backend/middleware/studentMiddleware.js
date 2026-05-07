const Joi = require('joi');

const createStudent = Joi.object({
  name: Joi.string().required(),
  role_id: Joi.number().required(),
  email: Joi.string().allow('', null),
  password: Joi.string().allow('', null),
  phone: Joi.string().allow('', null),
  admission_date: Joi.string().allow('', null),
  roll_no: Joi.string().allow('', null),
  admission_no: Joi.string().allow('', null),
});
const updateStudent = Joi.object({
  name: Joi.string().required(),
  role_id: Joi.number().required(),
  email: Joi.string().allow('', null),
  phone: Joi.string().allow('', null),
  admission_date: Joi.string().allow('', null),
  roll_no: Joi.string().allow('', null),
  admission_no: Joi.string().allow('', null),
});


module.exports = {
    createStudent,
    updateStudent
};