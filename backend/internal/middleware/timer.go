package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

const StartTimeKey = "request_start_time"

// ExecutionTimer records the start time of every incoming HTTP request.
func ExecutionTimer() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(StartTimeKey, time.Now())
		c.Next()
	}
}

// GetElapsedNanoseconds returns the elapsed time since request began in nanoseconds as string.
func GetElapsedNanoseconds(c *gin.Context) string {
	if val, exists := c.Get(StartTimeKey); exists {
		if startTime, ok := val.(time.Time); ok {
			return strconv.FormatInt(time.Since(startTime).Nanoseconds(), 10)
		}
	}
	return "0"
}

