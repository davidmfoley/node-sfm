var gulp = require('gulp');
var mocha = require('gulp-spawn-mocha');

gulp.task('test', function () {
  return gulp.src('./test', {read: false})
  .pipe(mocha({
    env: {NODE_ENV: 'test', MOCHA_FENGSHUI_MODE: 'minimal'},
    reporter: 'mocha-fengshui-reporter'
  }).on('error', function(){}));
});

gulp.task('watch', [], function() {
  gulp.watch(['./test/**/*.js', './lib/**/*.js'], ['test']);
});

gulp.task('default', ['watch']);
