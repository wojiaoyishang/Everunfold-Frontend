// Compatibility entry: web and internal sync now share FRONTEND_HOST/PORT.
process.env.NODE_ENV ??= "production";
console.log("Everunfold: 接收器已合并至前端，请使用 npm start。");
process.argv.splice(2, 0, "start");
await import("./plugins/run.mts");
