import { useState, useEffect, useContext } from 'react'
import { AppContext } from '../AppContext';
import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import { Box, Typography, Button, IconButton, InputBase, CircularProgress, Tooltip } from '@mui/material';
import MovingIcon from '@mui/icons-material/Moving';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const paginationModel = { page: 0, pageSize: 10 };

function transformRowData(rowData) {
    return rowData.map(item => ({
        id: item.id,
        name: item.name,
        date: new Date(item.start_ut * 1000),
        start_ut: item.start_ut,
        end_ut: item.end_ut,
        duration: item.end_ut - item.start_ut,
        playerCount: item.playerCount,
        view: item.id
    }));
}

function NameEditorCell(props) {
    const { params } = props;
    const [value, setValue] = useState(params.value);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('passive');

    const handleSave = async () => {
        setLoading(true)
        if (loading) return

        try {
            await sleep(500);
            if (value === "") {
                setStatus('error')
                return
            }

            const response = await fetch(`http://${window.location.hostname}:5004/Home/UpdateRecordingName`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: params.id,
                    name: value,
                }),
            });

            if (!response.ok) {
                setStatus('error')
            } else {
                setStatus('success')
            }

            setLoading(false)
        } catch (error) {
            setStatus('error');
            console.error(error);
        } finally {
            setLoading(false);

            setTimeout(() => {
                setStatus("passive");
            }, 2000);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingRight: '4px' }}>
            <InputBase
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                sx={{ flex: 1, minWidth: 0, mr: 1 }}
            />
            <IconButton color="primary" onClick={handleSave} size="small">
                {loading ?
                    <CircularProgress enableTrackSlot size="20px" /> :
                    <>
                        {(status === "passive") &&
                            <Tooltip title="Save" disableInteractive>
                                <CheckIcon color="primary" />
                            </Tooltip>
                        }
                        {(status === "success") && <CheckCircleOutlineIcon color="success" />}
                        {(status === "error") && <ErrorOutlineIcon color="error" />}
                    </>
                }
            </IconButton>
        </div>
    );
}

export default function RecordingsMenu() {
    const { setMenu } = useContext(AppContext)
    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState({ ids: 0 });

    const columns = [
        { field: 'id', headerName: '記録ID', type: 'int', width: 60, flex: 0 },
        { field: 'name', headerName: '記録名', type: 'string', width: 250, flex: 0, renderCell: (params) => <NameEditorCell params={params} /> },
        { field: 'date', headerName: '記録日時', type: 'date', width: 130, flex: 0 },
        { field: 'playerCount', headerName: '参加人数', type: 'int', width: 120, flex: 0 },
        { field: 'duration', headerName: '記録時間', type: 'int', width: 120, flex: 0 },
        {
            field: 'view', headerName: 'View', width: 80, flex: 0, renderCell: (params) => (
                <Tooltip title="Open for details" disableInteractive>
                    <IconButton
                        variant="text"
                        color="primary"
                        onClick={() => {
                            setMenu({ name: "Analytics", props: { start_ut: params.row.start_ut, end_ut: params.row.end_ut } })
                        }}
                    >
                        <MovingIcon />
                    </IconButton>
                </Tooltip>
            ),
        }
    ];

    const handleDeleteSelected = async () => {
        // Call Backend API to remove from database below:
        // <--- insert code here ---
        const response = await fetch(`http://${window.location.hostname}:5004/Home/DeleteRecordings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([...selected.ids]),
        });

        if (!response.ok) {
            console.error("Error Deleting Recordings: ", response.error)
        }
        // Remove from frontend 
        setRows(prevRows => prevRows.filter(row => !selected.ids.has(row.id)));
    };

    useEffect(() => {
        // Call Backend API to fetch recordings below:
        fetch(`http://${window.location.hostname}:5004/Home/GetRecordings`)
            .then(response => response.json())
            .then(data => {
                const newRows = transformRowData(data.value)
                setRows(newRows)
            })
            .catch(error => console.error('Error:', error));
    }, [])

    return (
        <Box>
            <Typography variant="h2" sx={{ marginBottom: "24px" }}>過去ログ</Typography>
            <Paper sx={{ height: "100%", width: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSizeOptions={[5, 10, 20, 30, 60]}
                    checkboxSelection
                    disableColumnResize
                    disableRowSelectionOnClick
                    disableRowSelectionExcludeModel
                    initialState={{
                        pagination: { paginationModel },
                        sorting: {
                            sortModel: [{ field: 'id', sort: 'desc' }],
                        },
                    }}
                    onRowSelectionModelChange={(newSelection) => {
                        setSelected(newSelection);
                    }}
                    sx={{
                        border: 1, borderColor: 'divider'
                    }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteSelected}
                        disabled={selected.ids.size === 0}
                        sx={{ width: 200, margin: 1 }}
                    >
                        Delete Selected {selected.ids.size > 0 ? `(${selected.ids.size})` : ""}
                    </Button>
                </Box>

            </Paper>
        </Box>
    );
}
