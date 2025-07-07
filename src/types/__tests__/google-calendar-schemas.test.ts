import {
  timeHHMMSchema,
  timeIntervalSchema,
  dayOfWeekSchema,
  dailyWorkingHoursSchema,
  doctorWorkingHoursSchema,
  updateWorkingHoursRequestSchema,
  doctorIdParamSchema
} from '../google-calendar-schemas';

describe('Google Calendar Schemas', () => {
  describe('timeHHMMSchema', () => {
    it('should validate correct time formats', () => {
      expect(timeHHMMSchema.safeParse('09:00').success).toBe(true);
      expect(timeHHMMSchema.safeParse('17:30').success).toBe(true);
      expect(timeHHMMSchema.safeParse('00:00').success).toBe(true);
      expect(timeHHMMSchema.safeParse('23:59').success).toBe(true);
    });

    it('should reject invalid time formats', () => {
      expect(timeHHMMSchema.safeParse('25:00').success).toBe(false);
      expect(timeHHMMSchema.safeParse('12:60').success).toBe(false);
      expect(timeHHMMSchema.safeParse('9:00').success).toBe(false);
      expect(timeHHMMSchema.safeParse('09:0').success).toBe(false);
      expect(timeHHMMSchema.safeParse('invalid').success).toBe(false);
    });
  });

  describe('timeIntervalSchema', () => {
    it('should validate correct time intervals', () => {
      const validInterval = {
        start: '09:00',
        end: '17:00'
      };
      expect(timeIntervalSchema.safeParse(validInterval).success).toBe(true);
    });

    it('should reject intervals where start >= end', () => {
      const invalidInterval1 = {
        start: '17:00',
        end: '09:00'
      };
      const invalidInterval2 = {
        start: '12:00',
        end: '12:00'
      };
      expect(timeIntervalSchema.safeParse(invalidInterval1).success).toBe(false);
      expect(timeIntervalSchema.safeParse(invalidInterval2).success).toBe(false);
    });
  });

  describe('dayOfWeekSchema', () => {
    it('should validate correct day names', () => {
      const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      validDays.forEach(day => {
        expect(dayOfWeekSchema.safeParse(day).success).toBe(true);
      });
    });

    it('should reject invalid day names', () => {
      expect(dayOfWeekSchema.safeParse('monday').success).toBe(false);
      expect(dayOfWeekSchema.safeParse('INVALID').success).toBe(false);
      expect(dayOfWeekSchema.safeParse('').success).toBe(false);
    });
  });

  describe('dailyWorkingHoursSchema', () => {
    it('should validate correct daily working hours', () => {
      const validDailyHours = {
        dayOfWeek: 'MONDAY',
        intervals: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '17:00' }
        ]
      };
      expect(dailyWorkingHoursSchema.safeParse(validDailyHours).success).toBe(true);
    });

    it('should allow empty intervals', () => {
      const validDailyHours = {
        dayOfWeek: 'SUNDAY',
        intervals: []
      };
      expect(dailyWorkingHoursSchema.safeParse(validDailyHours).success).toBe(true);
    });

    it('should reject overlapping intervals', () => {
      const invalidDailyHours = {
        dayOfWeek: 'MONDAY',
        intervals: [
          { start: '09:00', end: '13:00' },
          { start: '12:00', end: '17:00' } // Overlaps with previous
        ]
      };
      expect(dailyWorkingHoursSchema.safeParse(invalidDailyHours).success).toBe(false);
    });
  });

  describe('doctorWorkingHoursSchema', () => {
    it('should validate correct doctor working hours', () => {
      const validWorkingHours = {
        workingHours: [
          {
            dayOfWeek: 'MONDAY',
            intervals: [{ start: '09:00', end: '17:00' }]
          },
          {
            dayOfWeek: 'TUESDAY',
            intervals: [{ start: '09:00', end: '17:00' }]
          }
        ]
      };
      expect(doctorWorkingHoursSchema.safeParse(validWorkingHours).success).toBe(true);
    });

    it('should reject duplicate days', () => {
      const invalidWorkingHours = {
        workingHours: [
          {
            dayOfWeek: 'MONDAY',
            intervals: [{ start: '09:00', end: '17:00' }]
          },
          {
            dayOfWeek: 'MONDAY', // Duplicate
            intervals: [{ start: '10:00', end: '18:00' }]
          }
        ]
      };
      expect(doctorWorkingHoursSchema.safeParse(invalidWorkingHours).success).toBe(false);
    });

    it('should reject empty working hours array', () => {
      const invalidWorkingHours = {
        workingHours: []
      };
      expect(doctorWorkingHoursSchema.safeParse(invalidWorkingHours).success).toBe(false);
    });

    it('should reject more than 7 days', () => {
      const invalidWorkingHours = {
        workingHours: new Array(8).fill({
          dayOfWeek: 'MONDAY',
          intervals: [{ start: '09:00', end: '17:00' }]
        })
      };
      expect(doctorWorkingHoursSchema.safeParse(invalidWorkingHours).success).toBe(false);
    });
  });

  describe('updateWorkingHoursRequestSchema', () => {
    it('should validate correct request body', () => {
      const validRequest = {
        workingHours: [
          {
            dayOfWeek: 'MONDAY',
            intervals: [{ start: '09:00', end: '17:00' }]
          }
        ]
      };
      expect(updateWorkingHoursRequestSchema.safeParse(validRequest).success).toBe(true);
    });

    it('should reject request without workingHours', () => {
      const invalidRequest = {};
      expect(updateWorkingHoursRequestSchema.safeParse(invalidRequest).success).toBe(false);
    });
  });

  describe('doctorIdParamSchema', () => {
    it('should validate numeric string IDs', () => {
      expect(doctorIdParamSchema.safeParse({ id: '123' }).success).toBe(true);
      expect(doctorIdParamSchema.safeParse({ id: '1' }).success).toBe(true);
    });

    it('should reject non-numeric IDs', () => {
      expect(doctorIdParamSchema.safeParse({ id: 'abc' }).success).toBe(false);
      expect(doctorIdParamSchema.safeParse({ id: '12a' }).success).toBe(false);
      expect(doctorIdParamSchema.safeParse({ id: '' }).success).toBe(false);
    });

    it('should reject missing ID', () => {
      expect(doctorIdParamSchema.safeParse({}).success).toBe(false);
    });
  });
});