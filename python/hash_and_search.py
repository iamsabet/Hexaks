# import the necessary packages
from imutils import paths
import cv2
import os
import numpy

def dhash(image, hashSize=8):
	# resize the input image, adding a single column (width) so we
	# can compute the horizontal gradient
	resized = cv2.resize(image, (hashSize + 1, hashSize))

	# compute the (relative) horizontal gradient between adjacent
	# column pixels
	diff = resized[:, 1:] > resized[:, :-1]

	# convert the difference image to a hash
	hashNumber = sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])
	return bin(hashNumber)


# (assuming you're executing the code on a Unix machine)

image = cv2.imread("5.jpg") # small sizes
# convert the image to grayscale and compute the hash
image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
imageHash = dhash(image)
print(str(imageHash))

image = cv2.imread("6.jpg") # small sizes
# convert the image to grayscale and compute the hash
image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
imageHash = dhash(image)
print(str(imageHash))
