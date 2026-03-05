import { describe, it, expect } from 'vitest'
import { ApiError } from '../src/error'

describe('ApiError', () => {
  it('sets name, status, body, and message', () => {
    const err = new ApiError(404, { message: 'Not found' })
    expect(err.name).toBe('ApiError')
    expect(err.status).toBe(404)
    expect(err.body).toEqual({ message: 'Not found' })
    expect(err.message).toBe('API error: 404')
  })

  it('accepts a custom message', () => {
    const err = new ApiError(500, null, 'Custom message')
    expect(err.message).toBe('Custom message')
  })

  it('is an instance of Error', () => {
    expect(new ApiError(400, null)).toBeInstanceOf(Error)
  })

  describe('status helpers', () => {
    it.each([
      [301, 'isRedirect'],
      [302, 'isRedirect'],
      [401, 'isUnauthorized'],
      [403, 'isForbidden'],
      [404, 'isNotFound'],
      [409, 'isConflict'],
      [422, 'isUnprocessable'],
      [429, 'isTooManyRequests'],
      [400, 'isClientError'],
      [499, 'isClientError'],
      [500, 'isServerError'],
      [503, 'isServerError'],
      [300, 'isNonSuccess'],
      [422, 'isNonSuccess'],
      [500, 'isNonSuccess'],
    ] as const)('returns true for %d → %s', (status, method) => {
      const err = new ApiError(status, null)
      expect(err[method]()).toBe(true)
    })

    it('is() matches exact status', () => {
      expect(new ApiError(418, null).is(418)).toBe(true)
      expect(new ApiError(418, null).is(404)).toBe(false)
    })

    it('isClientError() is false for 500', () => {
      expect(new ApiError(500, null).isClientError()).toBe(false)
    })

    it('isServerError() is false for 404', () => {
      expect(new ApiError(404, null).isServerError()).toBe(false)
    })

    it('isRedirect() is false for 400', () => {
      expect(new ApiError(400, null).isRedirect()).toBe(false)
    })
  })

  describe('hasStatus()', () => {
    it('returns true and narrows type for matching status', () => {
      const err = new ApiError(422, { issues: [{ message: 'Required' }] })
      if (err.hasStatus(422)) {
        // TypeScript should allow accessing .body.issues here
        expect(err.body.issues[0].message).toBe('Required')
      } else {
        throw new Error('hasStatus should have matched')
      }
    })

    it('returns false for non-matching status', () => {
      const err = new ApiError(500, { message: 'Server error' })
      expect(err.hasStatus(422)).toBe(false)
    })
  })

  describe('toString()', () => {
    it('includes status and body JSON', () => {
      const err = new ApiError(404, { message: 'Not found' })
      expect(err.toString()).toBe('ApiError(404): {"message":"Not found"}')
    })
  })
})
