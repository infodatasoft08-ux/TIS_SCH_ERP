const Joi = require('joi');

const createClassSchema = Joi.object({
  grade_id: Joi.number().integer().required(),
  name: Joi.string().trim().required(),
  supervisor_teacher_id: Joi.number().integer().allow(null).optional(),
  room: Joi.string().allow('', null).optional(),
  capacity: Joi.number().integer().allow(null).optional()
});


const updateClassSchema = Joi.object({
  grade_id: Joi.number().integer().optional(),
  name: Joi.string().trim().optional(),
  supervisor_teacher_id: Joi.number().integer().allow(null).optional(),
  room: Joi.string().allow('', null).optional(),
  capacity: Joi.number().integer().allow(null).optional()
})
.min(1); 



module.exports = {
  createClassSchema,
  updateClassSchema
};