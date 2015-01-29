var gulp = require('gulp');
var mocha = require('gulp-spawn-mocha');
var jshint = require('gulp-jshint');

gulp.task('jshint', function () {
  return gulp.src(['./lib', './test'])
  .pipe(jshint('./.jshintrc'))
  .pipe(jshint.reporter('jshint-stylish'))
  .pipe(jshint.reporter('fail'));
});

gulp.task('test', function () {
  return gulp.src('./test', {read: false})
  .pipe(mocha({
    env: {NODE_ENV: 'test', MOCHA_FENGSHUI_MODE: 'minimal'},
    reporter: 'mocha-fengshui-reporter'
  }).on('error', function(){}));
});

gulp.task('watch', [], function() {
  gulp.watch(['./test/**/*.js', './lib/**/*.js'], ['jshint', 'test']);
});

gulp.task('default', ['watch']);
