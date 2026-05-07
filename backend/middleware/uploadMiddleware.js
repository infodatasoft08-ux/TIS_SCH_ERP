// const multer = require('multer');
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const cloudinary = require('../config/cloudinary');

// const teacherImageStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'school/teachers',
//     allowed_formats: ['jpg', 'jpeg', 'png'],
//     transformation: [{ width: 500, height: 500, crop: 'fill' }]
//   }
// });

// const uploadTeacherImage = multer({
//   storage: teacherImageStorage,
//   limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
// });

// const studentImageStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'school/students',
//     allowed_formats: ['jpg', 'jpeg', 'png'],
//     transformation: [{ width: 500, height: 500, crop: 'fill' }]
//   }
// });

// const uploadStudentImage = multer({
//   storage: studentImageStorage,
//   limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
// });

// const staffImageStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'school/staff',
//     allowed_formats: ['jpg', 'jpeg', 'png'],
//     transformation: [{ width: 500, height: 500, crop: 'fill' }]
//   }
// });

// const uploadStaffImage = multer({
//   storage: staffImageStorage,
//   limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
// });

// const adminImageStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'school/admins',
//     allowed_formats: ['jpg', 'jpeg', 'png'],
//     transformation: [{ width: 500, height: 500, crop: 'fill' }]
//   }
// });

// const uploadAdminImage = multer({
//   storage: adminImageStorage,
//   limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
// });

// const subjectImageStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'school/subjects',
//     allowed_formats: ['jpg', 'jpeg', 'png'],
//     transformation: [{ width: 500, height: 500, crop: 'fill' }]
//   }
// });

// const uploadSubjectImage = multer({
//   storage: subjectImageStorage,
//   limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
// });

// const eventImageStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'school/events',
//     allowed_formats: ['jpg', 'jpeg', 'png'],
//     transformation: [{ width: 500, height: 500, crop: 'fill' }]
//   }
// });

// const uploadEventImage = multer({
//   storage: eventImageStorage,
//   limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
// });

// // const noteStorage = new CloudinaryStorage({
// //   cloudinary,
// //   params: async (req, file) => {
// //     const ext = file.originalname.split('.').pop().toLowerCase();
// //     const nameWithoutExt = file.originalname.split('.').slice(0, -1).join('.');
// //     // Treat PDFs as 'raw' to avoid 'Blocked for delivery' errors in some Cloudinary setups
// //     const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);

// //     return {
// //       folder: 'school/notes',
// //       resource_type: isImage ? 'image' : 'raw',
// //       // For 'raw' files (PDF, Word, etc), public_id MUST include the extension to be served correctly
// //       public_id: isImage ? nameWithoutExt : `${nameWithoutExt}.${ext}`,
// //     };
// //   }
// // });

// const noteStorage = new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => {
//     const ext = file.originalname.split('.').pop().toLowerCase();

//     const imageFormats = ['jpg', 'jpeg', 'png', 'webp'];
//     const isImage = imageFormats.includes(ext);

//     return {
//       folder: 'school/notes',
//       resource_type: isImage ? 'image' : 'raw', // IMPORTANT
//       format: ext
//     };
//   }
// });

// const uploadNote = multer({
//   storage: noteStorage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
// });

// module.exports = {
//   uploadTeacherImage,
//   uploadStudentImage,
//   uploadStaffImage,
//   uploadSubjectImage,
//   uploadEventImage,
//   uploadAdminImage,
//   uploadNote
// };



const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// allowed formats
const imageFormats = ["jpg", "jpeg", "png", "webp", "gif"];
const documentFormats = ["pdf", "doc", "docx", "ppt", "pptx", "txt"];

function createStorage(folder) {
  return new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const ext = file.originalname.split(".").pop().toLowerCase();
      const isImage = imageFormats.includes(ext);

      return {
        folder: `school/${folder}`,
        resource_type: isImage ? "image" : "raw",
        format: ext,
        access_mode: "public",
        // transformation: isImage
        //   ? [{ width: 500, height: 500, crop: "fill" }]
        //   : undefined,

        transformation: isImage
          ? [
            {
              width: 500,
              height: 500,
              crop: "fill",

              quality: "auto:low",     // 🔥 compress image
              fetch_format: "auto",    // 🔥 convert to webp/avif automatically
              dpr: "auto",             // optimize for device
            },
          ]
          : undefined,
      };
    },
  });
}

function createUploader(folder, sizeMB = 5) {
  return multer({
    storage: createStorage(folder),
    limits: { fileSize: sizeMB * 1024 * 1024 },
  });
}

module.exports = {
  uploadTeacherImage: createUploader("teachers"),
  uploadStudentImage: createUploader("students"),
  uploadStaffImage: createUploader("staff"),
  uploadAdminImage: createUploader("admins"),
  uploadSubjectImage: createUploader("subjects"),
  uploadEventImage: createUploader("events"),
  uploadNoticeImage: createUploader("notices"),
  uploadSchoolGallery: createUploader("branding"),
  uploadNote: createUploader("notes", 10),
  uploadHomework: createUploader("homework", 5),
};