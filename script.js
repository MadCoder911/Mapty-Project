'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// const form = document.querySelector('.form');
// const containerWorkouts = document.querySelector('.workouts');
// const inputType = document.querySelector('.form__input--type');
// const inputDistance = document.querySelector('.form__input--distance');
// const inputDuration = document.querySelector('.form__input--duration');
// const inputCadence = document.querySelector('.form__input--cadence');
// const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, long]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/Km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}

////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.submit_form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.new_type');
const inputDistance = document.querySelector('.new_distance');
const inputDuration = document.querySelector('.new_duration');
const inputCadence = document.querySelector('.new_cadence');
const inputElevation = document.querySelector('.new_elgain');
const deleteAllBtn = document.querySelector('.del-button');
const alert = document.querySelector('.alert');
const alertBtn = document.querySelector('.alertBtn');
//edits
const editForm = document.querySelector('.form_edit');
const inputTypeEdit = document.querySelector('.edit_type');
const inputDistanceEdit = document.querySelector('.edit_distance');
const inputDurationEdit = document.querySelector('.edit_duration');
const inputCadenceEdit = document.querySelector('.edit_cadence');
const inputElevationEdit = document.querySelector('.edit_elgain');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  constructor() {
    //get users positions
    this._getPosition();
    // get data from local storage
    this._getLocalStorage();
    //Adding del button
    this._addDelBtn();
    //attach handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    deleteAllBtn.addEventListener('click', this._delAllWorkouts.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._delWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    editForm.addEventListener('submit', this._editValues.bind(this));
    inputTypeEdit.addEventListener('change', this._toggleElevationFieldEdit);
    alertBtn.addEventListener('click', this._closeAlert.bind(this));
  }

  _getPosition() {
    //Geolocation API
    // First function for success , second for failure
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your location');
      }
    );
  }

  _loadMap(position) {
    //Gettin g user lat and long
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    // putting position into array of coords
    const coords = [latitude, longitude];

    //Leaflet Library
    //Setting view into obtained coords
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //Getting latitude and longitude of where we clicked
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus;
  }
  _hideForm() {
    //empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _toggleElevationFieldEdit() {
    inputElevationEdit
      .closest('.form__row')
      .classList.toggle('form__row--hidden');
    inputCadenceEdit
      .closest('.form__row')
      .classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    //Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If workout is running creatre running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return this._showAlert();
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout is cycling create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      )
        return this._showAlert();
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    //Render workout on the map as a marker
    this._renderWorkoutMarker(workout);
    // Render workout on the list
    this._renderWorkout(workout);
    // Hide from + clear input fields
    this._hideForm();
    //Set local storage to all workouts
    this._setLocalStorage();
    //Delet button addition
    this._addDelBtn();
    // Hide alert if it exists
    this._closeAlert();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <i class="fa-solid edit-icon fa-pen-to-square" data-id="${workout.id}"></i>
    <i class="fa fa-trash del-icon" aria-hidden="true" data-id="${
      workout.id
    }"></i>
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;
    if (workout.type === 'running')
      html += `<div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace?.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
</li>`;

    if (workout.type === 'cycling')
      html += `<div class="workout__details">
<span class="workout__icon">⚡️</span>
<span class="workout__value">${workout.speed?.toFixed(1)}</span>
<span class="workout__unit">km/h</span>
</div>
<div class="workout__details">
<span class="workout__icon">⛰</span>
<span class="workout__value">${workout.elevationGain}</span>
<span class="workout__unit">m</span>
</div>
</li>`;
    form.insertAdjacentHTML('afterend', html);
  }
  ///////////////////////////////////////////
  ///////////////////////////////////////////
  ///////////////////////////////////////////
  //EXTRA ADDITIONS MADE ON MY OWNN
  // Adding workouts delete button
  _addDelBtn() {
    if (this.#workouts.length > 0) {
      deleteAllBtn.classList.remove('hidden');
    }
  }
  // Deleting all workouts btn functionality
  _delAllWorkouts(e) {
    e.preventDefault();
    this.reset();
  }

  // Delete a single workout
  _delWorkout(e) {
    //Defining the target, delete icon and the workout to delete.
    const element = e.target.closest('.del-icon'); //trash icon
    const workoutEl = e.target.closest('.workout'); // workout elemnt
    if (!element) return;

    //Finding index if the workout in #workouts array
    const workout = this.#workouts.find(wo => wo.id === element.dataset.id);
    const desiredObject = this.#workouts.findIndex(obj => {
      return obj.id === workout.id;
    });
    //Removing the workout by it's index from the #workouts array
    workoutEl.style.display = 'none';
    this.#workouts.splice(desiredObject, 1);
    this._setLocalStorage();
    location.reload();
  }
  // ******EDIT WORKOUT******
  //Showing the form
  _editWorkout(e) {
    const editBtn = e.target.closest('.edit-icon');
    if (!editBtn) return;
    const workoutObj =
      this.#workouts[
        this.#workouts.findIndex(workout => {
          return workout.id === editBtn.dataset.id;
        })
      ];

    editForm.setAttribute('data-id', `${workoutObj.id}`);
    editForm.classList.remove('hidden');
  }
  // Setting values
  _editValues(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    const workoutObj =
      this.#workouts[
        this.#workouts.findIndex(workout => {
          return workout.id === editForm.dataset.id;
        })
      ];

    // If running obj
    if (workoutObj.type === 'running') {
      let type = inputTypeEdit.value;
      let duration = inputDurationEdit.value;
      let distance = inputDistanceEdit.value;
      let cadence = inputCadenceEdit.value;
      if (
        !validInputs(duration, distance, cadence) &&
        !allPositive(duration, distance, cadence)
      ) {
        return this._showAlert();
      } else {
        workoutObj.type = type;
        workoutObj.duration = duration;
        workoutObj.distance = distance;
        workoutObj.cadence = cadence;
        workoutObj.calcPace();
      }
    }

    // If Cycling
    if (workoutObj.type === 'cycling') {
      let type = inputTypeEdit.value;
      let duration = inputDurationEdit.value;
      let distance = inputDistanceEdit.value;
      let elevationGain = inputElevationEdit.value;
      if (
        !validInputs(duration, distance, elevationGain) &&
        !allPositive(duration, distance, elevationGain)
      ) {
        return this._showAlert();
      } else {
        workoutObj.type = type;
        workoutObj.duration = duration;
        workoutObj.distance = distance;
        workoutObj.elevationGain = elevationGain;
        workoutObj.calcSpeed();
      }
    }

    this._setLocalStorage();
    location.reload();
  }
  // Show alert
  _showAlert() {
    alert.classList.remove('hidden');
  }
  // Close Alert
  _closeAlert(e) {
    const alertButton = e.target.closest('.alertBtn');
    alert.classList.add('hidden');
  }
  // SORT WORKOUTS

  //
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    // console.log(workoutEl);
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: { duration: 1 },
    });

    // using the public interface
    // workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    //Linking objects back to prototyoes
    this.#workouts = data;
    this.#workouts.forEach(work => {
      work.type === 'running'
        ? Object.setPrototypeOf(work, Running.prototype)
        : Object.setPrototypeOf(work, Cycling.prototype);
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
