# Watermark_Video_Server

A NodeJS script to put logo on the videos and text on it like tiktok.

Clone the repository, Run Command 'npm install'

now in the repository folder add an image of logo name 'logo.png'

and before you run the script you need to install ffmpeg to your Program Files folder and add 'path/ffmpeg/bin' to your path environment variable

you can install ffmpeg from https://www.gyan.dev/ffmpeg/builds/ download the latest release full build 

and run the script using 'node server'

Open the browser and Open this link for testing 

http://localhost:3000/Username?videoURL=https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4

in this url you can change the "Username" to your name and the last file will be downloaded as a file type.

You have to add '.mp4' at the end of downloaded file to watch the logo added file.

Optional:

This script can also delete the local files while doing the process, to do that just uncomment the deletefiles method in each response command.

It is not a great script but can always be used as a reference, if you like it. do star the repository and share with others!

Thank you from Shahzad!
