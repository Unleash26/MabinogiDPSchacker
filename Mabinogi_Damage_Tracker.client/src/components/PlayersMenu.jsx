import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../AppContext';
import { DataGrid } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';

const paginationModel = { page: 0, pageSize: 20 };

export default function PlayersMenu() {
    // ★安全装置: コンテキストが空っぽでもクラッシュしないように初期値を入れる
    const context = useContext(AppContext) || {};
    const renamePlayer = context.renamePlayer || (() => console.warn("名前変更機能が見つかりません"));
    const playerNames = context.playerNames || {}; // ここが undefined だと死ぬので {} にする

    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);

    // 名前編集用の状態
    const [open, setOpen] = useState(false);
    const [editTarget, setEditTarget] = useState({ id: '', currentName: '' });
    const [newName, setNewName] = useState('');

    const fetchPlayers = () => {
        setLoading(true);
        fetch(`http://${window.location.hostname}:5004/Home/GetAllPlayers`)
            .then(response => response.json())
            .then(data => {
                const safeData = Array.isArray(data.value) ? data.value : [];
                setPlayers(safeData);
            })
            .catch(error => {
                console.error('Error:', error);
                setPlayers([]);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    // 編集ボタンクリック
    const handleEditClick = (player) => {
        // 名簿に名前があればそれを、なければ元の名前を表示
        const currentDisplayName = playerNames[player.playerId] || player.playerName;
        setEditTarget({ id: player.playerId, currentName: currentDisplayName });
        setNewName(currentDisplayName);
        setOpen(true);
    };

    // 保存ボタンクリック
    const handleSave = () => {
        if (newName.trim() !== "") {
            renamePlayer(editTarget.id, newName);
        }
        setOpen(false);
    };

    // 列定義
    const columns = [
        { field: 'playerId', headerName: 'プレイヤーID', width: 150 },
        { 
            field: 'displayName',
            headerName: 'キャラクター名', 
            width: 200,
            renderCell: (params) => {
                // ★安全装置: playerNames が空でもエラーにならないように
                return (playerNames && playerNames[params.row.playerId]) || params.row.playerName;
            }
        },
        {
            field: 'action',
            headerName: '操作',
            width: 140, // 少し広げた
            renderCell: (params) => (
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditClick(params.row)}
                    sx={{ color: '#90caf9', borderColor: '#90caf9' }}
                >
                    名前変更
                </Button>
            ),
        },
    ];

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight="bold">
                    プレイヤーリスト
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<RefreshIcon />} 
                    onClick={fetchPlayers}
                    disabled={loading}
                >
                    {loading ? '読込中...' : '更新'}
                </Button>
            </Stack>

            <DataGrid
                rows={players}
                columns={columns}
                getRowId={(row) => row.playerId || Math.random()}
                initialState={{ pagination: { paginationModel } }}
                pageSizeOptions={[10, 20, 50]}
                disableColumnResize
                sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
            />

            {/* 名前変更ダイアログ */}
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>名前の変更</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        ID: {editTarget.id} の表示名を変更します。<br/>
                        ※元の名前: {editTarget.currentName}
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="新しい名前"
                        fullWidth
                        variant="standard"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} sx={{ color: '#999' }}>キャンセル</Button>
                    <Button onClick={handleSave} variant="contained">保存</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}