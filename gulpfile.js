var gulp = require('gulp');
var clean = require('gulp-clean');
var uglify = require('gulp-uglify');
var sass = require('gulp-sass');

gulp.task('clean:dist', function () {
  return gulp.src('dist')
    .pipe(clean());
});

gulp.task('build', ['clean:dist'], function() {
  return gulp.src('src/**/*.js')
    .pipe(uglify({
      mangleProperties: {
        regex: /^_/
      }
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('sass', function(){
  return gulp.src('./sass/**/*.scss')
  .pipe(sass({
    outputStyle: 'compressed'
  }).on('error', sass.logError))
  .pipe(gulp.dest('./dist'))
});

gulp.task('sass:watch', function(){
  gulp.watch('./sass/**/*.scss', ['sass']);
});

gulp.task('default', ['build', 'sass']);
