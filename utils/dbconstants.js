// Desc: Constants used in the application

module.exports = Object.freeze({
  BOOKING_TYPES: Object.freeze({
    MATCH: 1000,
    LESSON: 5000,
    TOURNAMENT: 6000,
    MAINTENANCE: 7000,
    RAIN: 7001,
    CLOSED: 7002,
    EVENT: 8000,
    MENTORING: 8001,
    JUNIOR_PROGRAM: 8002,
    LADDER: 8003,
  }),
  ROLES: Object.freeze({
    ADMIN: 4000,
    MANAGER: 3000,
    PROFESSIONAL: 2500,
    MEMBER: 2000,
    JUNIOR: 1500,
    RETRICTED_MEMBER: 1000,
    GUEST: 500,
  }),
  ROLE_TYPES: Object.freeze({
    GUEST_TYPE: 100,
    RESTRICTED_MEMBER_TYPE: 200,
    MEMBER_TYPE: 300,
    INSTRUCTOR_TYPE: 350,
    MANAGER_TYPE: 400,
    SYSADMIN_TYPE: 1000,
  }),
});
