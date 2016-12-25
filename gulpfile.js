var gulp = require('gulp');
var clean = require('gulp-clean');
var uglify = require('gulp-uglify');
var sass = require('gulp-sass');
var concat = require('gulp-concat');

gulp.task('clean:dist', function () {
  return gulp.src('dist')
    .pipe(clean());
});

gulp.task('build', ['clean:dist'], function() {
  return gulp.src([
      'src/utils.js',
      'src/feature.js',
      'src/persistence.js',
      'src/features/label.js',
      'src/features/nap.js',
      'src/features/node.js',
      'src/features/line.js',
      'src/features/poly.js',
      'src/features/measure.js',
      'src/features/style.js',
      'src/features/trash.js',
      'src/handlers.js',
      'src/core.js'
    ])

    .pipe(uglify({
      mangleProperties: {
        regex: /^_/
      }
    }))

    .pipe(concat('Leaflet.LinearMeasurement.js'))

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
