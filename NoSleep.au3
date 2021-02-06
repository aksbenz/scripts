#include <WindowsConstants.au3>
#include <MsgBoxConstants.au3>

Dim $mpos = MouseGetPos()
$curX = $mpos[0]
$curY = $mpos[1]

While 1
	$mpos = MouseGetPos()
	If ($curX <> $mpos[0] Or $curY <> $mpos[1]) Then
		$curX = $mpos[0]
		$curY = $mpos[1]
	Else
		MouseMove($curX+10,$curY+10,0)
		MouseMove($curX,$curY,0)
	EndIf
	Sleep(60000)
WEnd