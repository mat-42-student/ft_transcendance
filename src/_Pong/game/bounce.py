# separate file to not complicate Game.py

from .const import STATS
from math import pi, degrees, radians, cos, sin, atan2


RAD90 = pi / 2
RAD180 = pi
RAD270 = pi + RAD90
RAD360 = pi * 2


def bounce(ball_direction, ball_pos, paddle_pos, paddle_size):
	collision_side = int(ball_direction[0] > 0)
	signed_side = collision_side * 2 - 1
	max_angle_rad = radians(STATS["maxAngleDeg"])

	hit_position = map(ball_pos[1],
		paddle_pos - paddle_size/2, paddle_pos + paddle_size/2,
		-1, 1)

	# don't think too much about it
	angle = threejs_angle(ball_direction)
	if angle > RAD180:
		angle = -signed_side * (
			(RAD360 if collision_side == 0 else RAD180)
			- angle)
	if angle > RAD90:
		angle = RAD90 - (angle - RAD90)

	angle = clamp(angle, -max_angle_rad, max_angle_rad)

	redirection = hit_position * STATS["redirectionFactor"]

	newAngle = clamp(angle + redirection, -max_angle_rad, max_angle_rad)

	new_direction = rotate([signed_side, 0], newAngle * signed_side)
	new_direction[0] *= -1
	return new_direction


def map(input, in_min, in_max, out_min, out_max):
	return out_min + (input - in_min) / (in_max - in_min) * (out_max - out_min)

def clamp(input, min, max):
	if input < min:
		return min
	if input > max:
		return max
	return input


def threejs_angle(vec):
	return atan2(-vec[1], -vec[0]) + pi


def rotate(vec, rad):
	return [
		(vec[0] * cos(rad)) - (vec[1] * sin(rad)),
		(vec[0] * sin(rad)) + (vec[1] * cos(rad))
	]
